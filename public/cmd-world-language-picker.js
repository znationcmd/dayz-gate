/* CMD universal language picker — 8148 ISO 639-3 / BCP47 entries.
 * A language preference is NOT a claim that every interface text is translated.
 * Works without cookies, API keys, databases, tracking or paid services.
 */
(function(){
 "use strict";
 if(typeof window==="undefined"||window.CMDWorldLanguagePicker)return;
 const tag=/^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,5}(?:-x(?:-[a-z0-9]{1,8}){1,5})?$/i;
 const originalChoices=["fr","en","us","de","es","it","ru","ko","ja","zh","co","pt"];
 // CLDR-derived country/language associations, not promises of translation.
 const countries=[["AF","Afghanistan",["fa-AF","fa","ps","haz","tk","prd","bgn","kaa","ug"]],["ZA","Afrique du Sud",["en","zu","xh","af","nso","tn","st","ts","ss","ve","hi","nr","sw"]],["AL","Albanie",["sq","el","mk"]],["DZ","Algérie",["ar-DZ","arq","ar","fr","mey","kab","en","mzb","grr"]],["DE","Allemagne",["de","en","fr","bar","nds","nl","it","es","ru","vmf","tr","gsw","da","swg","hr","ku","el","ksh","pl","hsb","frr","dsb","frs","stq","pfl"]],["AD","Andorre",["ca","es","fr"]],["AO","Angola",["pt","umb","kmb","ln"]],["AI","Anguilla",["en"]],["AQ","Antarctique",[]],["AG","Antigua-et-Barbuda",["en","pt"]],["SA","Arabie saoudite",["ar","ars"]],["AR","Argentine",["es-AR","es","en","cy","gn"]],["AM","Arménie",["hy","ru","ku","az"]],["AW","Aruba",["nl","pap","en"]],["AU","Australie",["en","zh-Hant","it","wbp","hnj"]],["AT","Autriche",["de","bar","en","fr","it","hr","sl","hu"]],["AZ","Azerbaïdjan",["az","tly","ku","ttt","tkr"]],["BS","Bahamas",["en"]],["BH","Bahreïn",["ar","ml"]],["BD","Bangladesh",["bn","en","rkt","syl","rhg","ccp","my","grt","mro","mni"]],["BB","Barbade",["en"]],["BE","Belgique",["fr","nl","de","wa-BE","en","vls","wa"]],["BZ","Belize",["en","es","bzj","kek","mop","cab"]],["BJ","Bénin",["fr","fon","yo","blo"]],["BM","Bermudes",["en"]],["BT","Bhoutan",["dz","ne","tsj","en","lep"]],["BY","Biélorussie",["ru","be"]],["BO","Bolivie",["es","qu","ay","gn","aro"]],["BA","Bosnie-Herzégovine",["bs","en","hr","sr","sr-Latn"]],["BW","Botswana",["en","tn","af"]],["BR","Brésil",["pt-BR","pt","en","de","it","vec","ja","es","kgp","ko","yrl","gub","xav"]],["BN","Brunéi Darussalam",["ms","zh-Hant","en"]],["BG","Bulgarie",["bg","en","ru","tr","de"]],["BF","Burkina Faso",["mos","dyu","fr","ff"]],["BI","Burundi",["rn","fr","sw","en"]],["KH","Cambodge",["km","cja","kdt"]],["CM","Cameroun",["fr","en","bum","ff","ewo","ybb","bbj","nnh","bkm","bas","bax","byv","mua","maf","bfd","bss","kkj","dua","mgo","ar","jgo","ksf","ken","agq","nmg","yav"]],["CA","Canada",["en","fr-CA","fr","es","zh","pa","ar","hi","fil","yue","it","de","ur","pt","ru","ta","vi","fa","gu","ko","pl","el","uk","bn","ro","nl","ja","sr","tr","hr","hu","so","iu","pdt","oj","ojs","crk","chp","moe","mic","atj","bla","cr","crl","csw","war","ojw","den","dgr","crg","moh","dak","hur","nsk","clc","kwk","pqm","oka","lil","gwi"]],["CV","Cap-Vert",["kea","pt"]],["CL","Chili",["es","en","arn"]],["CN","Chine",["zh-Hans","zh","wuu","yue","hsn","hak","nan","gan","ii","ug","za","bo","ko","lis","nxq","khb","tdd","mww","lcp","en","hnj","ru","vi","lzh"]],["CY","Chypre",["el","en","tr","fr","hy","ar","ecy"]],["CO","Colombie",["es","guc","yrl"]],["KM","Comores",["ar","zdj","wni","fr"]],["CG","Congo-Brazzaville",["fr","ln"]],["CD","Congo-Kinshasa",["fr","sw","lua","ln","lu","kg","lol","rw"]],["KP","Corée du Nord",["ko"]],["KR","Corée du Sud",["ko"]],["CR","Costa Rica",["es"]],["CI","Côte d’Ivoire",["fr","bci","sef","dnj","kfo","bqv"]],["HR","Croatie",["hr","en","it","vec"]],["CU","Cuba",["es"]],["CW","Curaçao",["pap","nl","es"]],["DK","Danemark",["da","en","de","sv","fo","kl","jut"]],["DJ","Djibouti",["fr","aa","so","ar"]],["DM","Dominique",["en"]],["EG","Égypte",["ar-EG","ar","arz","en","cop","el"]],["AE","Émirats arabes unis",["ar","en","ml","ps","bal","fa"]],["EC","Équateur",["es","qu","qug"]],["ER","Érythrée",["ti","en","tig","ar","aa","ssy","byn"]],["ES","Espagne",["es","ca-ES","eu-ES","ast-ES","en","ca","gl","eu","ast","ext","an","oc"]],["EE","Estonie",["et","ru","en","fi","vro","ie"]],["SZ","Eswatini",["en","ss","zu","ts"]],["VA","État de la Cité du Vatican",["it","la"]],["FM","États fédérés de Micronésie",["en","chk","pon","kos","yap","uli"]],["US","États-Unis",["en","es","zh-Hant","fr","de","fil","it","vi","ko","ru","mww","nv","yi","pdc","hnj","haw","frc","chr","esu","dak","cho","lkt","ik","mus","oka","cad","cic","io","jbo","osa"]],["ET","Éthiopie",["en","am","om","so","ti","sid","wal","aa","gez"]],["FJ","Fidji",["en","hi","hif","fj","rtm"]],["FI","Finlande",["fi","en","sv","de","ru","et","rmf","se","smn","sms"]],["FR","France",["fr","co-FR","br-FR","oc-FR","en","es","de","oc","it","pt","pcd","gsw","br","co","hnj","ca","eu","nl","frp","mww","ia"]],["GA","Gabon",["fr","puu"]],["GM","Gambie",["en","man","ff"]],["GE","Géorgie",["ka","xmf","ru","hy","ab","os"]],["GS","Géorgie du Sud et îles Sandwich du Sud",["en"]],["GH","Ghana",["ak","en","ee","abr","gur","ada","gaa","nzi","ha","saf","ff"]],["GI","Gibraltar",["en","es"]],["GR","Grèce",["el","en","fr","de","pnt","mk","tr","bg","sq","tsd","gmy","grc"]],["GD","Grenade",["en"]],["GL","Groenland",["kl","da"]],["GP","Guadeloupe",["fr"]],["GU","Guam",["en","ch"]],["GT","Guatemala",["es","cak","kek","quc","mam","en","kjb","poh","acr","ixl","tzj","knj","cac","jac","agu","caa","poc","quv","usp","qum","cab","ttc","xin","ckz","mop","itz"]],["GG","Guernesey",["en"]],["GN","Guinée",["fr","ff","man","sus","nqo","kpe"]],["GQ","Guinée équatoriale",["es","fan","fr","bvb","pt"]],["GW","Guinée-Bissau",["pt","fr","knf","ff"]],["GY","Guyana",["en"]],["GF","Guyane française",["fr","gcr","zh-Hant","hnj"]],["HT","Haïti",["ht","fr"]],["HN","Honduras",["es","cab","en"]],["HU","Hongrie",["hu","en","de","fr","ro","hr","sk","sl"]],["BV","Île Bouvet",["no"]],["CX","Île Christmas",["en"]],["IM","Île de Man",["en","gv"]],["NF","Île Norfolk",["en"]],["AX","Îles Åland",["sv"]],["KY","Îles Caïmans",["en"]],["CC","Îles Cocos",["en"]],["CK","Îles Cook",["en"]],["FO","Îles Féroé",["fo"]],["HM","Îles Heard et McDonald",[]],["FK","Îles Malouines",["en"]],["MP","Îles Mariannes du Nord",["en","ch"]],["MH","Îles Marshall",["en","mh"]],["UM","Îles mineures éloignées des États-Unis",["en"]],["PN","Îles Pitcairn",["en"]],["SB","Îles Salomon",["en","pis","rug"]],["TC","Îles Turques-et-Caïques",["en"]],["VG","Îles Vierges britanniques",["en"]],["VI","Îles Vierges des États-Unis",["en"]],["IN","Inde",["hi","en","bn","te","mr","ta","ur","gu","kn","ml","or","pa","bho","awa","as","bgc","mag","mai","mwr","hne","dcc","bjj","ne","sat","wtm","rkt","ks","knn","kok","swv","gbm","lmn","sd","gon","kfy","doi","kru","sck","wbq","xnr","khn","tcy","wbr","brx","noe","bhb","mni","raj","hoc","mtr","unr","bhi","hoj","kha","kfr","grt","unx","bfy","srx","saz","ccp","bfq","njo","ria","bo","bpy","bft","bra","lep","kxv","btv","lif","lah","sa","kht","dv","dz"]],["ID","Indonésie",["id","jv","su","mad","ms","min","bew","ban","bug","bjn","ace","sas","bbc","zh-Hant","mak","ljp","rej","gor","nij","kge","aoz","kvr","lbw","gay","rob","mdr","sxn","sly","mwv","kaw"]],["IQ","Irak",["ar","en","ckb","fa","lrc","syr"]],["IR","Iran",["fa","mzn","glk","sdh","tk","lrc","ar","bal","rmt","bqi","luz","lki","kaa","ckb","bgn","prd","hy","ps","ka","gbz"]],["IE","Irlande",["en","ga","fr"]],["IS","Islande",["is","da"]],["IL","Israël",["he","en","ar","apc","ru","ro","yi","pl","lad","hu","am","ti","ml"]],["IT","Italie",["it","scn-IT","nap-IT","en","fr","lmo","sc","de","vec","pms","nap","lij","scn","sdc","sl","fur","egl","lld","ca","el","hr","mhn","rgn"]],["JM","Jamaïque",["en","jam"]],["JP","Japon",["ja","ryu","ko"]],["JE","Jersey",["en"]],["JO","Jordanie",["ar","apc","en"]],["KZ","Kazakhstan",["ru","kk","en","de","kaa"]],["KE","Kenya",["sw","en","ki","luy","luo","kam","kln","guz","mer","mas","ebu","so","dav","teo","pko","om","saq","ar","pa","gu"]],["KG","Kirghizistan",["ky","ru","kaa"]],["KI","Kiribati",["en","gil"]],["KW","Koweït",["ar"]],["RE","La Réunion",["fr","rcf","ta"]],["LA","Laos",["lo","kjg","hnj","mww","kdt"]],["LS","Lesotho",["st","en","zu","ss","xh"]],["LV","Lettonie",["lv","en","ru","ltg"]],["LB","Liban",["apc","ar","en","fr","hy"]],["LR","Libéria",["en","lir","kpe","bsq","grb","dnj","mev","kss","vai","bza","men","ff"]],["LY","Libye",["ar"]],["LI","Liechtenstein",["de","gsw","wae"]],["LT","Lituanie",["lt","ru","en","de","sgs"]],["LU","Luxembourg",["lb-LU","fr","lb","de","en","pt"]],["MK","Macédoine du Nord",["mk","sq","tr"]],["MG","Madagascar",["mg","fr","en"]],["MY","Malaisie",["ms","en","zh","ta","iba","jv","zmi","dtp","ml","bug","bjn"]],["MW","Malawi",["en","ny","tum","tog","zu"]],["MV","Maldives",["dv","en"]],["ML","Mali",["bm","fr","ffm","snk","mwk","ses","tmh","khq","dtm","kao","ar","bmq","bze"]],["MT","Malte",["mt","en","it","fr"]],["MA","Maroc",["ar-MA","ary","ar","fr","zgh","en","tzm","shi","rif","mey","es"]],["MQ","Martinique",["fr"]],["MU","Maurice",["mfe","fr","en","bho","ur","ta"]],["MR","Mauritanie",["mey","ar","fr","ff","wo"]],["YT","Mayotte",["swb","fr","buc","sw"]],["MX","Mexique",["es-MX","es","en","yua","nhe","nhw","maz","nch","vec","sei"]],["MD","Moldavie",["ro","uk","bg","gag","ru"]],["MC","Monaco",["fr"]],["MN","Mongolie",["mn","zh","ru"]],["ME","Monténégro",["sr-Latn","sq","sr"]],["MS","Montserrat",["en"]],["MZ","Mozambique",["pt","vmw","ndc","ts","ngl","seh","mgh","rng","ny","yao","sw","zu"]],["MM","Myanmar (Birmanie)",["my","shn","kac","rhg","mnw","hnj","stu","kht"]],["NA","Namibie",["af","kj","ng","naq","hz","en","de","tn"]],["NR","Nauru",["en","na"]],["NP","Népal",["ne","mai","bho","new","jml","en","dty","awa","thl","bap","tdg","thr","lif","mgp","thq","mrd","bfy","xsr","rjs","taj","hi","gvr","bo","tkt","suz","tdh","bn","lep"]],["NI","Nicaragua",["es"]],["NE","Niger",["ha","dje","fr","fuq","tmh","ar","twq","ff"]],["NG","Nigéria",["en","pcm","ha","ig","yo","fuv","tiv","efi","ibb","bin","kaj","kcg","ar","cch","amo","ann","ff"]],["NU","Niue",["en","niu"]],["NO","Norvège",["nb-NO","nn-NO","nb","no","nn","se"]],["NC","Nouvelle-Calédonie",["fr"]],["NZ","Nouvelle-Zélande",["en","mi"]],["OM","Oman",["ar","bal","fa"]],["UG","Ouganda",["sw","lg","nyn","cgg","xog","en","teo","laj","ach","myx","rw","ttj","hi"]],["UZ","Ouzbékistan",["uz","ru","kaa","tr"]],["PK","Pakistan",["ur","en","lah","ps","sd","skr","bal","hno","brh","fa","bgn","hnd","gju","bft","kvx","khw","mvy","gjk","kxp","ks","trw","btv"]],["PW","Palaos",["pau","en"]],["PA","Panama",["es","en","zh-Hant"]],["PG","Papouasie-Nouvelle-Guinée",["tpi","en","ho"]],["PY","Paraguay",["gn","es","de"]],["NL","Pays-Bas",["fy-NL","nl","en","de","fr","nds","li","fy","gos","id","zea","rif","tr"]],["BQ","Pays-Bas caribéens",["pap","nl"]],["PE","Pérou",["qu-PE","es","qu","ay"]],["PH","Philippines",["en","fil","es","ceb","ilo","hil","bik","war","fbl","pam","pag","mdh","tsg","zh-Hant","cps","krj","bto","hnn","tbw","bku"]],["PL","Pologne",["pl","en","de","ru","szl","be","uk","csb","sli","lt","prg"]],["PF","Polynésie française",["fr","ty","zh-Hant"]],["PR","Porto Rico",["es","en"]],["PT","Portugal",["pt-PT","pt","en","fr","es","gl"]],["QA","Qatar",["ar","fa","ml"]],["HK","R.A.S. chinoise de Hong Kong",["zh-Hant","yue","en","zh"]],["MO","R.A.S. chinoise de Macao",["zh-Hant","yue","en","zh","fil","pt"]],["CF","République centrafricaine",["sg","fr","ln"]],["DO","République dominicaine",["es","en"]],["RO","Roumanie",["ro","en","fr","es","hu","de","tr","sr-Latn","bg","el","pl"]],["GB","Royaume-Uni",["en","fr","de","es","pl","pa","ur","ta","gu","sco","cy","ro","bn","ar","zh-Hant","it","lt","pt","so","tr","ga","gd","kw","pi"]],["RU","Russie",["ru","tt","ba","cv","hy","ce","av","udm","chm","os","sah","kbd","myv","dar","bua","mdf","kum","kv","lez","krc","inh","tyv","ady","krl","lbe","koi","abq","mrj","alt","fi","sr","vep","mn","kaa","izh","cu","vot"]],["RW","Rwanda",["rw","en","fr"]],["EH","Sahara occidental",["ar","mey"]],["BL","Saint-Barthélemy",["fr"]],["KN","Saint-Christophe-et-Niévès",["en"]],["SM","Saint-Marin",["it","eo"]],["MF","Saint-Martin",["fr"]],["SX","Saint-Martin (partie néerlandaise)",["en","es","vic","nl"]],["PM","Saint-Pierre-et-Miquelon",["fr","en"]],["VC","Saint-Vincent-et-les-Grenadines",["en"]],["SH","Sainte-Hélène",["en"]],["LC","Sainte-Lucie",["en"]],["SV","Salvador",["es","ccr","ppl","len"]],["WS","Samoa",["sm","en"]],["AS","Samoa américaines",["sm","en"]],["ST","Sao Tomé-et-Principe",["pt","fr"]],["SN","Sénégal",["wo","fr","ff","srr","dyo","sav","mfv","bjt","snf","knf","bsc","tnr"]],["RS","Serbie",["sr-Latn","sr-Cyrl","sr","sq","hu","ro","hr","sk","uk"]],["SC","Seychelles",["crs","fr","en"]],["SL","Sierra Leone",["kri","en","men","tem","ff"]],["SG","Singapour",["en","zh","ms","ta","ml","pa"]],["SK","Slovaquie",["sk","cs","en","de","hu","uk","pl"]],["SI","Slovénie",["sl","hr","en","de","vec","hu","it"]],["SO","Somalie",["so","ar","sw","om"]],["SD","Soudan",["apd","ar","en","bej","fvr","mls","fia","zag"]],["SS","Soudan du Sud",["ar","en","nus"]],["LK","Sri Lanka",["si","ta","en"]],["SE","Suède",["sv","en","fi","fit","se","rmu","yi","smj","sma","ia"]],["CH","Suisse",["gsw-CH","gsw-CH-x-bern","gsw-CH-x-zueri","gsw-CH-x-basel","gsw-CH-x-wallis","gsw-CH-x-luzern","de-CH","fr-CH","it-CH","rm-CH","de","gsw","en","fr","it","lmo","pt","rm","rmo","wae"]],["SR","Suriname",["nl","srn","zh-Hant","hnj"]],["SJ","Svalbard et Jan Mayen",["nb","ru"]],["SY","Syrie",["apc","ar","ku","fr","hy","syr"]],["TJ","Tadjikistan",["tg","ru","fa","ar"]],["TW","Taïwan",["zh-Hant","trv"]],["TZ","Tanzanie",["sw","en","suk","nym","kde","bez","ksb","mas","mgy","asa","lag","jmc","rof","vun","rwk","sbp"]],["TD","Tchad",["ar","fr"]],["CZ","Tchéquie",["cs","en","sk","de","pl"]],["TF","Terres australes françaises",["fr"]],["IO","Territoire britannique de l’océan Indien",["en"]],["PS","Territoires palestiniens",["ar","apc"]],["TH","Thaïlande",["th","en","tts","nod","sou","mfa","zh-Hant","kxm","kdt","mnw","hnj","shn","mww","lcp","lwl"]],["TL","Timor oriental",["pt","tet"]],["TG","Togo",["fr","ee","ife","blo"]],["TK","Tokelau",["tkl","en","sm"]],["TO","Tonga",["to","en"]],["TT","Trinité-et-Tobago",["en","es"]],["TN","Tunisie",["ar-TN","aeb","ar","fr"]],["TM","Turkménistan",["tk","ru","uz","kaa"]],["TR","Turquie",["tr","en","ku","apc","zza","kbd","az","ar","bgx","bg","ady","kiu","kaa","hy","ka","sr-Latn","lzz","sq","ab","el","tru","uz","kk"]],["TV","Tuvalu",["tvl","en"]],["UA","Ukraine",["uk","ru","pl","yi","rue","be","crh","ro","bg","tr","hu","el"]],["UY","Uruguay",["es"]],["VU","Vanuatu",["bi","en","fr"]],["VE","Venezuela",["es","yrl"]],["VN","Vietnam",["vi","mww","zh-Hant","blt","hnj","cjm"]],["WF","Wallis-et-Futuna",["fr","wls","fud"]],["YE","Yémen",["ar","en"]],["ZM","Zambie",["bem","ny","en","toi","loz","nse","leb","tum","kqn","lun","lue"]],["ZW","Zimbabwe",["sn","en","nd","mxc","ndc","kck","ny","ve","tn"]]];
 const normalized=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr");
 const status={languages:null,loading:null};
 const STORE="cmd-world-language",MODE="cmd-world-language-mode",PAGE_SIZE=75;
 const read=key=>{try{return localStorage.getItem(key)}catch{return null}};
 const write=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
 const existing=()=>read(STORE)||"fr";
 function detect(){
  const langs=[...(Array.isArray(navigator.languages)?navigator.languages:[]),navigator.language];
  try{langs.push(Intl.DateTimeFormat().resolvedOptions().locale)}catch{}
  const preferred=langs.map(validate).find(Boolean)||"fr";let zone="";
  try{zone=Intl.DateTimeFormat().resolvedOptions().timeZone||""}catch{}
  const zones={"Europe/Berlin":"de-DE","Europe/Rome":"it-IT","Europe/Madrid":"es-ES",
    "Europe/Paris":"fr-FR","Europe/Lisbon":"pt-PT","Europe/Vienna":"de-AT",
    "Europe/Amsterdam":"nl-NL","Europe/London":"en-GB","Europe/Warsaw":"pl-PL",
    "Europe/Prague":"cs-CZ","Europe/Stockholm":"sv-SE","Europe/Copenhagen":"da-DK",
    "Asia/Tokyo":"ja-JP","Asia/Seoul":"ko-KR","Asia/Kolkata":"hi-IN",
    "America/Sao_Paulo":"pt-BR","America/Mexico_City":"es-MX"};
  if(zones[zone])return zones[zone];
  const multilingual={"Europe/Zurich":"CH","Europe/Brussels":"BE","America/Toronto":"CA"};
  if(multilingual[zone])return validate(preferred.split("-")[0]+"-"+multilingual[zone])||preferred;
  return preferred;
 }
 function initLocale(){
  const old=read(STORE),mode=read(MODE);
  if(old&&!mode)write(MODE,"manual"); // Previously selected users keep their choice.
  if(old&&(mode==="manual"||!mode))return old;
  const code=detect();write(STORE,code);write(MODE,"auto");return code;
 }
 const root=document.createElement("div");
 root.id="cmd-world-language-root";
 root.style.cssText="position:fixed;right:14px;bottom:14px;z-index:2147483000;pointer-events:none";
 const shadow=root.attachShadow({mode:"open"});
 const style=document.createElement("style");
 style.textContent=`
*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}
.trigger{pointer-events:auto;display:flex;gap:6px;align-items:center;justify-content:center;min-width:51px;min-height:48px;padding:9px;border:1px solid #9772ff;color:#fff;border-radius:15px;background:linear-gradient(145deg,#281443,#111322);box-shadow:0 8px 28px #0008}
.panel{pointer-events:auto;position:absolute;bottom:58px;right:0;width:min(360px,calc(100vw - 25px));height:min(510px,calc(100dvh - 100px));padding:16px;display:flex;flex-direction:column;gap:10px;color:#f8f4ff;border:1px solid #9b69ec;border-radius:18px;background:#111323;box-shadow:0 14px 40px #000b;font:14px/1.4 system-ui,-apple-system,Arial,sans-serif}
.panel[hidden]{display:none}.head{display:flex;align-items:center;justify-content:space-between;gap:12px}.head strong{font-size:16px}
.close{border:1px solid #65517c;border-radius:10px;background:#27203b;color:#fff;padding:5px 12px}
input{min-height:42px;border:1px solid #604984;border-radius:10px;background:#202239;color:#fff;padding:9px;width:100%;outline-offset:2px}
.results{min-height:80px;overflow-y:auto;flex:1;border:1px solid #2d2541;border-radius:9px}
.choice{display:block;width:100%;background:transparent;color:#e9e6f5;border:0;border-bottom:1px solid #342e4c;text-align:left;padding:9px 10px;overflow-wrap:anywhere}
.choice:hover,.choice:focus{background:#352052}
.muted{font-size:12px;color:#cfc4e9;line-height:1.45;margin:0}
.status{font-size:12px;color:#bcefd3;min-height:20px;overflow-wrap:anywhere}
.auto{display:flex;align-items:center;gap:9px;cursor:pointer;color:#efe6ff;font-size:13px}
.auto input{width:20px;height:20px;min-height:20px}
.more{width:100%;min-height:44px;border:1px solid #775ea1;border-radius:10px;background:#23233d;color:#fff;padding:11px}
.counter{font-size:12px;color:#d5cbe7;margin:0}
.alphabet{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;flex:none}
.letter{background:#231935;color:#ece3ff;border:1px solid #735c9b;border-radius:8px;min-width:0;min-height:39px;font-weight:750;padding:3px}
.letter[aria-pressed="true"]{border-color:#70dafa;background:#403064;box-shadow:0 0 0 1px #70dafa55}
.letter:focus-visible{outline:2px solid #fff;outline-offset:1px}

`;
 const trigger=document.createElement("button");trigger.type="button";trigger.className="trigger";
 trigger.setAttribute("aria-label","Choisir une langue ou un dialecte");
 trigger.title="Langues du monde, y compris le suisse allemand";trigger.textContent="🌐";
 const panel=document.createElement("section");panel.className="panel";panel.hidden=true;
 panel.setAttribute("aria-label","Langues et dialectes du monde");panel.setAttribute("role","dialog");
 const head=document.createElement("div");head.className="head";
 const title=document.createElement("strong");title.textContent="🌍 Pays et langues";
 const close=document.createElement("button");close.type="button";close.className="close";close.textContent="Fermer";head.append(title,close);
 const query=document.createElement("input");query.type="search";query.placeholder="Pays ou langue : Allemagne, Suisse, corse…";
 query.setAttribute("aria-label","Rechercher un pays ou une langue ou un dialecte");
 const automatic=document.createElement("label");automatic.className="auto";
 const checkbox=document.createElement("input");checkbox.type="checkbox";
 const autoLabel=document.createElement("span");autoLabel.textContent="🌍 Détecter la langue automatiquement";
 automatic.append(checkbox,autoLabel);
 const autoInfo=document.createElement("p");autoInfo.className="muted";
 const counter=document.createElement("p");counter.className="counter";
 const alphabet=document.createElement("div");alphabet.className="alphabet";
 alphabet.setAttribute("role","group");alphabet.setAttribute("aria-label","Pays classés de A à Z");
 const letters=["Toutes",..."ABCDEFGHIJKLMNOPQRSTUVWXYZ","#"];let letter="A",selectedCountry=null,viewMode="countries";
 for(const key of letters){
  const item=document.createElement("button");item.type="button";item.className="letter";item.dataset.letter=key;
  item.textContent=key==="Toutes"?"Tout":key==="#"?"Autres":key;
  item.setAttribute("aria-label",key==="Toutes"?"Tous les pays":key==="#"?"Autres pays": "Pays commençant par "+key);
  item.setAttribute("aria-pressed",String(key===letter));
  alphabet.append(item);
 }
 function showLetters(){alphabet.querySelectorAll("[data-letter]").forEach(el=>el.setAttribute("aria-pressed",String((el.dataset.letter==="Toutes"?"":el.dataset.letter)===letter)))}
 const results=document.createElement("div");results.className="results";results.setAttribute("role","group");
 const custom=document.createElement("input");custom.type="text";custom.maxLength=64;
 custom.placeholder="Code régional personnel : gsw-CH-x-bern";
 custom.setAttribute("aria-label","Code de langue régional BCP 47");
 const applyCustom=document.createElement("button");applyCustom.type="button";applyCustom.className="close";applyCustom.textContent="Utiliser ce code";
 const note=document.createElement("p");note.className="muted";
 note.textContent="Les 8 148 codes identifient des langues, pas 8 148 traductions. Si une interface n'est pas traduite, elle garde sa langue existante. Le dialecte suisse allemand peut utiliser l'allemand standard comme secours.";
 const msg=document.createElement("p");msg.className="status";msg.setAttribute("role","status");
 const customRow=document.createElement("details");const summary=document.createElement("summary");
 summary.textContent="Autres dialectes (code régional facultatif)";
 const customControls=document.createElement("div");customControls.append(custom,applyCustom);
 customRow.append(summary,customControls);
 panel.append(head,automatic,autoInfo,query,alphabet,counter,results,customRow,note,msg);
 shadow.append(style,panel,trigger);
 function fallback(code){
  const base=String(code).split("-")[0].toLowerCase();
  return ({gsw:"de",fra:"fr",eng:"en",deu:"de",ger:"de",spa:"es",ita:"it",zho:"zh",cos:"co",por:"pt"})[base]||base;
 }
 function validate(input){
  const raw=String(input||"").trim();if(!tag.test(raw)||raw.length>64)return null;
  try{return Intl.getCanonicalLocales(raw)[0]||null}catch{return null}
 }
 function save(code,label,mode="manual"){
  const safe=validate(code);if(!safe){msg.textContent="Code BCP 47 invalide.";return}
  const fb=fallback(safe);
  write(STORE,safe);write(MODE,mode);checkbox.checked=mode==="auto";
  document.documentElement.lang=safe;
  const ids=["language","mobile-language","lng","cmd-sphere-language","cmdLanguageChoice","cmdSettingsLanguagePicker"];
  for(const id of ids){
   const select=document.getElementById(id);
   if(!select||select.tagName!=="SELECT")continue;
   const candidates=[safe,fb,fb==="en"?"us":""];
   const match=candidates.find(c=>c&&[...select.options].some(option=>option.value===c));
   if(match&&select.value!==match){
    select.value=match;select.dispatchEvent(new Event("change",{bubbles:true}));
   }
  }
  const known=originalChoices.includes(fb);
  if(known){
   const legacyKeys=["cmdLang","cmdpad-language","cmdpad-ui-lang","dayz-gate-language","ark-language","cmd-browser-lang"];
   for(const key of legacyKeys){try{if(localStorage.getItem(key)!==null)localStorage.setItem(key,fb)}catch{}}
  }
  window.dispatchEvent(new CustomEvent("cmd-world-language-change",{detail:{language:safe,fallback:fb,mode}}));
  msg.textContent="✓ "+(label||safe)+" · "+safe+" · "+(mode==="auto"?"automatique":"manuel")+". "+(safe!==fb?"Interface existante : "+fb+" si disponible.":"");
  autoInfo.textContent=mode==="auto"?"Langue déduite de la langue et de la région de l'appareil, sans GPS.":"Choix personnel conservé jusqu'à changement.";
  if(status.languages)render();
  trigger.setAttribute("aria-label","Langue choisie : "+safe);
  trigger.title="Langue : "+safe;
 }
 let matched=[],shown=0;
 function nextPage(){
  results.querySelector('[data-cmd-more]')?.remove();
  const end=Math.min(shown+PAGE_SIZE,matched.length),active=existing();
  for(let i=shown;i<end;i++){
   const [code,name]=matched[i];const button=document.createElement("button");
   button.type="button";button.className="choice";
   button.setAttribute("aria-pressed",String(code===active));
   button.textContent=(code===active?"✓ ":"")+name+" · "+code;
   button.addEventListener("click",()=>save(code,name));results.append(button);
  }
  shown=end;
  counter.textContent=shown.toLocaleString("fr-FR")+" / "+matched.length.toLocaleString("fr-FR")+" langues affichées";
  if(shown<matched.length){
   const more=document.createElement("button");more.type="button";more.className="more";more.dataset.cmdMore="1";
   more.textContent="Afficher la suite · "+(matched.length-shown).toLocaleString("fr-FR")+" restantes";
   more.addEventListener("click",nextPage);results.append(more);
  }
 }
 function renderWorld(){
  results.replaceChildren();shown=0;matched=[];
  if(!status.languages){results.textContent="Chargement du catalogue…";return}
  const queryText=query.value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if(!queryText&&letter){
   for(const [code,name] of status.languages){
    const first=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").charAt(0).toUpperCase();
    if(letter==="#"?!/^[A-Z]$/.test(first):first===letter)matched.push([code,name]);
   }
  }else if(!queryText){
   const byCode=new Map(status.languages),seen=new Set();
   const priority=[existing(),"fr","en","de","es","it","co","gsw-CH","gsw-CH-x-bern","gsw-CH-x-zueri","gsw-CH-x-basel","gsw-CH-x-wallis","gsw-CH-x-luzern"];
   for(const code of priority)if(byCode.has(code)&&!seen.has(code)){matched.push([code,byCode.get(code)]);seen.add(code)}
   for(const entry of status.languages)if(!seen.has(entry[0])){matched.push(entry);seen.add(entry[0])}
  }else{
   for(const [code,name] of status.languages){
    const full=(code+" "+name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    if(full.includes(queryText))matched.push([code,name]);
   }
  }
  if(matched.length)nextPage();else{
   counter.textContent="0 langue trouvée";
   results.textContent="Aucune langue trouvée. Essaie un autre nom ou un code.";
  }
 }

 function worldButton(){
  const b=document.createElement("button");b.type="button";b.className="more";
  b.textContent="🌐 Rechercher les 8 148 langues du monde";
  b.addEventListener("click",()=>{viewMode="world";selectedCountry=null;letter="";query.value="";showLetters();render()});
  results.append(b);
 }
 function renderCountries(){
  results.replaceChildren();
  const search=normalized(query.value.trim());
  const found=countries.filter(([code,name])=>{
    if(search)return normalized(name+" "+code).includes(search);
    const first=normalized(name).charAt(0).toUpperCase();
    return letter===""||(letter==="#"?!/^[A-Z]$/.test(first):first===letter);
  });
  counter.textContent=found.length+" pays et territoires"+(letter?" en "+letter:"")+" · choisir un pays";
  for(const [code,name,languages] of found){
   const button=document.createElement("button");button.type="button";button.className="choice";
   button.dataset.cmdCountry=code;
   button.textContent=name+" · "+code+" ›";
   button.addEventListener("click",()=>{selectedCountry=code;viewMode="country-languages";query.value="";render()});
   results.append(button);
  }
  if(!found.length){const p=document.createElement("p");p.className="muted";p.textContent="Aucun pays trouvé.";results.append(p)}
  worldButton();
 }
 function renderCountryLanguages(){
  results.replaceChildren();
  const item=countries.find(c=>c[0]===selectedCountry);
  if(!item){viewMode="countries";return renderCountries()}
  const [code,name,associated]=item;
  counter.textContent=name+" · langues associées";
  const back=document.createElement("button");back.type="button";back.className="more";
  back.textContent="← Retour aux pays";
  back.addEventListener("click",()=>{viewMode="countries";selectedCountry=null;render()});
  results.append(back);
  const known=new Map(status.languages||[]);
  for(const language of associated){
   if(!validate(language))continue;
   const btn=document.createElement("button");btn.type="button";btn.className="choice";
   btn.setAttribute("aria-pressed",String(existing()===language));
   btn.textContent=(existing()===language?"✓ ":"")+(known.get(language)||language)+" · "+language;
   btn.addEventListener("click",()=>save(language,known.get(language)||language));
   results.append(btn);
  }
  if(!associated.length){
   const note=document.createElement("p");note.className="muted";
   note.textContent="Aucune langue nationale répertoriée pour ce territoire. La recherche mondiale reste disponible.";
   results.append(note);
  }
  worldButton();
 }
 function render(){
  if(viewMode==="country-languages")return renderCountryLanguages();
  if(viewMode==="countries")return renderCountries();
  return renderWorld();
 }
 async function load(){
  if(status.languages)return;
  if(!status.loading){
   status.loading=fetch("/cmd-world-languages.json",{cache:"force-cache"})
    .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
    .then(o=>{if(!Array.isArray(o.languages)||o.languages.length<8000)throw Error("Catalogue incomplet");status.languages=o.languages})
    .catch(e=>{msg.textContent="Catalogue indisponible : "+e.message+". Saisie régionale possible.";results.textContent="Recherche indisponible."})
    .finally(()=>{status.loading=null;render()});
  }
  await status.loading;
 }
 async function toggle(){panel.hidden=!panel.hidden;trigger.setAttribute("aria-expanded",String(!panel.hidden));if(!panel.hidden){query.focus();await load();}}
 trigger.addEventListener("click",toggle);
 close.addEventListener("click",()=>{panel.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.focus()});
 query.addEventListener("input",()=>{
  letter="";selectedCountry=null;showLetters();
  const term=normalized(query.value.trim());
  viewMode=term&&!countries.some(([code,name])=>normalized(code+" "+name).includes(term))?"world":"countries";
  render();
 });
 alphabet.addEventListener("click",event=>{
  const button=event.target.closest("button[data-letter]");
  if(!button||!alphabet.contains(button))return;
  letter=button.dataset.letter==="Toutes"?"":button.dataset.letter;
  selectedCountry=null;viewMode="countries";query.value="";showLetters();render();
 });
 checkbox.addEventListener("change",()=>{if(checkbox.checked)save(detect(),"Langue de l'appareil","auto");else save(existing(),"Langue actuelle","manual")});
 applyCustom.addEventListener("click",()=>save(custom.value,custom.value));
 custom.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();save(custom.value,custom.value)}});
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!panel.hidden){panel.hidden=true;trigger.setAttribute("aria-expanded","false")}});
 document.addEventListener("DOMContentLoaded",()=>{if(!document.getElementById(root.id))document.body.append(root)},{once:true});
 if(document.readyState!=="loading")document.body.append(root);
 const saved=initLocale();checkbox.checked=read(MODE)==="auto";
 autoInfo.textContent=checkbox.checked?"Langue détectée : "+saved+" (appareil et région, sans GPS).":"Langue choisie personnellement : "+saved;
 if(validate(saved))document.documentElement.lang=saved;
 if(checkbox.checked)window.addEventListener("DOMContentLoaded",()=>window.dispatchEvent(
  new CustomEvent("cmd-world-language-change",{detail:{language:saved,fallback:fallback(saved),mode:"auto"}})
 ),{once:true});
 window.CMDWorldLanguagePicker={get language(){return existing()},open:()=>{if(panel.hidden)void toggle()},set:(code)=>save(code,code)};
})();
