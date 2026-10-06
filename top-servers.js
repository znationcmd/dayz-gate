const base=()=>String(process.env.TOP_SERVERS_API_URL||'https://extinction-rss-production.up.railway.app').replace(/\/$/,'');
const key=()=>String(process.env.TOP_SERVERS_API_KEY||'');
async function request(path,{method='GET',body}={}){
 const headers={Accept:'application/json'};if(method!=='GET'){headers['Content-Type']='application/json';if(key())headers.Authorization='Bearer '+key();}
 const r=await fetch(base()+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Object.assign(new Error(data.error||'top_servers_error'),{status:r.status});
 return data;
}
module.exports={
 list:async game=>(await request('/api/top-servers?limit=25'+(game?'&game='+encodeURIComponent(game):''))).servers||[],
 register:async input=>(await request('/api/top-servers/register',{method:'POST',body:input})).server,
 vote:async(id,userId,sourceBot)=>request('/api/top-servers/'+encodeURIComponent(id)+'/vote',{method:'POST',body:{userId,sourceBot}})
};