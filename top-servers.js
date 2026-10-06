const base=()=>String(process.env.TOP_SERVERS_API_URL||'https://bot-ark-production.up.railway.app').replace(/\/$/,'');
const key=()=>String(process.env.TOP_SERVERS_WRITE_KEY||'');
async function request(path,{method='GET',body,write=false}={}){
 const headers={Accept:'application/json'};
 if(method!=='GET')headers['Content-Type']='application/json';
 if(write&&key())headers.Authorization='Bearer '+key();
 const r=await fetch(base()+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Object.assign(new Error(data.error||'top_servers_error'),{status:r.status});
 return data;
}
module.exports={
 list:async()=>request('/api/top-servers'),
 register:async input=>request('/api/top-servers',{method:'POST',body:input,write:true}),
 vote:async id=>request('/api/top-servers/'+encodeURIComponent(id)+'/vote',{method:'POST',body:{}})
};
