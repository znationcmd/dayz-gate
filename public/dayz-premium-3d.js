/* CMD DayZ Gate — visual-only activation glow.
 * Delegated events preserve ALL existing click handlers, forms, URLs and permissions. */
(()=>{"use strict";
 const select='button,a.btn,a.smallbtn,.gate-discord,.gate-guild-btn,[data-page]';
 let current=null;
 document.addEventListener("click",event=>{
  const candidate=event.target?.closest?.(select);
  if(!candidate||candidate.disabled||candidate.getAttribute("aria-disabled")==="true")return;
  if(current&&current!==candidate)current.classList.remove("cmd-gate-click-lit");
  candidate.classList.remove("cmd-gate-click-lit");
  void candidate.offsetWidth;
  candidate.classList.add("cmd-gate-click-lit");
  current=candidate;
 },{capture:true});
 document.addEventListener("keydown",event=>{
  if(event.key!=="Escape")return;
  if(current){current.classList.remove("cmd-gate-click-lit");current=null}
 });
})();
