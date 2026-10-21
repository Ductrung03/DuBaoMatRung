// Small process-local read cache. The controller includes data revision and
// current authorization scope in every key; no credentials are stored here.
class ResultCache {
  constructor(){this.entries=new Map();this.bytes=0;}
  remove(key){const old=this.entries.get(key);if(old){this.bytes-=old.bytes;this.entries.delete(key);}}
  async get(key){const entry=this.entries.get(key);if(!entry)return null;if(entry.expires<=Date.now()){this.remove(key);return null;}return entry.value;}
  async set(key,value,ttl=30){
    this.remove(key);const bytes=Buffer.byteLength(JSON.stringify(value));if(bytes>32*1024*1024)return;
    for(const [k,entry]of this.entries)if(entry.expires<=Date.now())this.remove(k);
    while(this.entries.size>=16||this.bytes+bytes>64*1024*1024)this.remove(this.entries.keys().next().value);
    // Current authorization and alert revision are checked before every lookup.
    this.entries.set(key,{value,bytes,expires:Date.now()+Math.min(ttl,120)*1000});this.bytes+=bytes;
  }
}
module.exports=ResultCache;
