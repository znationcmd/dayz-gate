/* DayZ Gate B+C background movement — visual layer only.
 * Reuses existing CSS background; never alters navigation, accounts or buttons. */
(()=>{"use strict";
  if(document.getElementById("cmd-dayz-motion-particles"))return;
  const overlay=document.createElement("div");
  overlay.id="cmd-dayz-motion-particles";
  overlay.setAttribute("aria-hidden","true");
  const add=()=>{if(document.body&&!overlay.isConnected)document.body.prepend(overlay)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",add,{once:true});
  else add();
  const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
  const wide=window.matchMedia("(min-width: 900px) and (pointer: fine)");
  let queued=false,x=0,y=0;
  function parallax(event){
    if(motion.matches||!wide.matches||document.hidden)return;
    x=((event.clientX/window.innerWidth)-.5)*20;
    y=((event.clientY/window.innerHeight)-.5)*14;
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      document.documentElement.style.setProperty("--dg-pointer-x",x.toFixed(2)+"px");
      document.documentElement.style.setProperty("--dg-pointer-y",y.toFixed(2)+"px");
    });
  }
  document.addEventListener("pointermove",parallax,{passive:true});
  const reset=()=>{
    document.documentElement.style.removeProperty("--dg-pointer-x");
    document.documentElement.style.removeProperty("--dg-pointer-y");
  };
  motion.addEventListener?.("change",reset);
  wide.addEventListener?.("change",reset);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)reset()});
})();
