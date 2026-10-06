const express=require('express');
const http=require('http');
const path=require('path');

const app=express();
const target=process.env.BOT_INTERNAL_URL||'http://dayz-gate-bot.railway.internal:8080';

app.set('trust proxy',1);

function proxy(req,res){
  const u=new URL(req.originalUrl||req.url,target);
  const headers={...req.headers,host:req.headers.host};
  delete headers['content-length'];
  const options={
    protocol:u.protocol,
    hostname:u.hostname,
    port:u.port||80,
    method:req.method,
    path:u.pathname+u.search,
    headers
  };
  const p=http.request(options,r=>{
    res.statusCode=r.statusCode||502;
    for(const [k,v] of Object.entries(r.headers)){
      if(v!==undefined)res.setHeader(k,v);
    }
    r.pipe(res);
  });
  p.on('error',e=>{
    console.error('Proxy DayZ Gate :',e.code||e.message);
    if(!res.headersSent)res.status(502).json({error:'Bot DayZ Gate indisponible'});
  });
  req.pipe(p);
}

app.get('/health',(req,res)=>res.json({ok:true,service:'dayz-gate-dashboard'}));
app.use(['/api','/auth','/oauth','/callback','/dayz-gate-apple-180.jpg'],proxy);
app.use(express.static(path.join(__dirname,'public'),{etag:true,maxAge:'5m'}));
app.use((req,res,next)=>{
  if(req.method!=='GET'&&req.method!=='HEAD')return proxy(req,res);
  res.sendFile(path.join(__dirname,'public','index.html'));
});

const port=Number(process.env.PORT||8080);
app.listen(port,'0.0.0.0',()=>console.log('Dashboard DayZ Gate séparé actif sur le port '+port));
