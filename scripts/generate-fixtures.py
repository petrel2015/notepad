from pathlib import Path
import hashlib,json,argparse
parser=argparse.ArgumentParser(description="Generate deterministic local acceptance fixtures; no source data is used.")
parser.add_argument("--gib",action="store_true",help="Also generate a 1 GiB fixture (requires free disk space)")
args=parser.parse_args()
base=Path('.local/fixtures');base.mkdir(exist_ok=True)
fixtures={
 'precision.json':'{"id":900719925474099312345,"tiny":1.234567890123456789,"message":"中文😀"}',
 'duplicate.json':'{"a":1,"a":2}',
 'mixed.txt':'第一行\r\nsecond\nthird\rfourth\t😀  ',
 'compare-a.txt':'alpha\nbeta\ngamma\n',
 'compare-b.txt':'alpha\nBETA\ngamma\ndelta\n',
}
for name,text in fixtures.items(): (base/name).write_bytes(text.encode())
record=('2026-10-28 INFO 中文😀 token-needle sample text\r\n').encode()
manifest=[]
sizes=[('large-20mb.txt',20*1024**2),('large-100mb.txt',100*1024**2)]
if args.gib:sizes.append(('large-1gb.txt',1024**3))
for name,minimum in sizes:
 count=(minimum+len(record)-1)//len(record); digest=hashlib.sha256()
 with (base/name).open('wb') as f:
  remaining=count
  while remaining:
   n=min(remaining,10000);chunk=record*n;f.write(chunk);digest.update(chunk);remaining-=n
 manifest.append({'file':name,'bytes':count*len(record),'matches':count,'lines':count+1,'sha256':digest.hexdigest()})
(base/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
