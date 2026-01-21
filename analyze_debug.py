import json
import re

# The  file is actually storing response BIEs in entries
# but they're embedded in the HAR format
# We need to use the Chrome DevTools Protocol to get full response bodies

debug_file = r'c:\Users\yazan alrifae\Desktop\chrom ext\content\debug\hof-debug-session-mko7xmvr-9kk0owm.json'
output_file = r'c:\Users\yazan alrifae\Desktop\chrom ext\star_spin_analysis.txt'

with open(debug_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

with open(output_file, 'w', encoding='utf-8') as out:
    out.write("STAR SPIN ANALYSIS - Debug Session\n")
    out.write("="*100 + "\n\n")
    
    spin_count = 0
    
    for log_index, log_entry in enumerate(data):
        if 'log' not in log_entry:
            continue
        
        log = log_entry['log']
        if 'entries' not in log:
            continue
        
        out.write(f"LOG #{log_index + 1}: {len(log['entries'])} HTTP entries\n\n")
        
        for entry_index, entry in enumerate(log['entries']):
            request = entry.get('request', {})
            response = entry.get('response', {})
            
            url = request.get('url', '')
            method = request.get('method', '')
            
            # Look for spin requests
            if 'handler.ashx' in url and method == 'POST':
                spin_count += 1
                
                # Parse request body
                post_data = request.get('postData', {})
                request_body = post_data.get('text', '')
                
                cmd = 'unknown'
                req_id = 'unknown'
                if request_body:
                    try:
                        req_json = json.loads(requestbody)
                        cmd = req_json.get('cmd', 'unknown')
                        req_id = req_json.get('id', 'unknown')
                    except:
                        pass
                
                out.write(f"\n{'='*100}\n")
                out.write(f"SPIN #{spin_count} (Entry #{entry_index + 1})\n")
                out.write(f"{'='*100}\n")
                out.write(f"Command: {cmd}\n")
                out.write(f"Request ID: {req_id}\n")
                out.write(f"URL: {url}\n")
                out.write(f"STATUS: {response.get('status')}\n")
                out.write(f"\nREQUEST BODY:\n{'-'*80}\n")
                out.write(request_body[:500] if request_body else 'N/A')
                out.write(f"\n{'-'*80}\n")
                
                # Note: HAR format doesn't include full response body by default
                # Response bodies are not captured in this debug file
                content = response.get('content', {})
                out.write(f"\nRESPONSE PREVIEW:\n{'-'*80}\n")
                out.write(f"Size: {content.get('size', 0)} bytes\n")
                out.write(f"MIME Type: {content.get('mimeType', 'N/A')}\n")
                
                # Check if response text is available
                if 'text' in content:
                    out.write(f"\nResponse Body:\n")
                    out.write(content['text'][:2000])  # First 2000 chars
                else:
                    out.write("Response body not captured in HAR\n")
                out.write(f"\n{'-'*80}\n\n")
    
    out.write(f"\n\nTOTAL SPIN REQUESTS FOUND: {spin_count}\n")

print(f"Analysis saved to: {output_file}")
print(f"Total spin requests found: {spin_count}")
