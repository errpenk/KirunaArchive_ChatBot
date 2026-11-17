// Edit event records here; IDs must stay fixed because URLs and image names use them.
window.KirunaArchiveData = (() => {
const CORE_EVENTS=[
{id:1,year:1900,month:5,day:17,era:'industrial',title:'LKAB Begins Industrial Mining',cat:'mine',featured:true,lat:67.8558,lng:20.2254,emoji:'🏭',
desc:"LKAB commences large-scale iron ore extraction at Kiirunavaara. The mine grew into one of the world's largest underground iron ore operations, producing approximately 27 million tonnes of iron ore annually.",
loc:'Kiirunavaara Mine, Kiruna',coords:'67.8558°N, 20.2254°E',tags:['Mining','LKAB','Industrial','Iron Ore'],
sources:[{t:'LKAB. "History of LKAB." lkab.com, 2024.',u:'https://www.lkab.com/en/'},{t:'Swedish Mining Association. svemin.se, 2023.',u:'https://www.svemin.se/en/'}]},
{id:2,year:1902,month:11,day:15,era:'industrial',title:'Malmbanan Railway Completed',cat:'infra',featured:false,lat:67.8499,lng:20.2277,emoji:'🚂',
desc:"The Ore Railway (Malmbanan) linking Kiruna to Narvik's ice-free port is completed — 473 km of Arctic engineering built 1899–1902. Still the primary export route for Swedish iron ore today.",
loc:'Kiruna Station (Kiruna C)',coords:'67.8499°N, 20.2277°E',tags:['Railway','Malmbanan','Arctic Engineering'],
sources:[{t:'Trafikverket. "Malmbanan." trafikverket.se, 2024.',u:'https://www.trafikverket.se/'},{t:'Swedish National Railway Museum. jernhuset.se.',u:'https://www.jernhuset.se/'}]},
{id:3,year:1910,month:6,day:3,era:'industrial',title:'Garden City Master Plan',cat:'urban',featured:true,lat:67.8549,lng:20.2295,emoji:'🏙️',
desc:"Architect Per Hallman designs Kiruna's urban plan based on Ebenezer Howard's Garden City principles — separating industrial and residential zones with a central square and ordered street grid.",
loc:'Old Town Centre (Gamla Centrum)',coords:'67.8549°N, 20.2295°E',tags:['Urban Planning','Garden City','Per Hallman'],
sources:[{t:'Riksantikvarieämbetet. "Kiruna Cultural Heritage." raa.se, 2023.',u:'https://www.riksantikvarieambetet.se/'},{t:'Howard, E. "Garden Cities of To-morrow." 1902.',u:'https://archive.org/details/gardencitiestom00howagoog'}]},
{id:4,year:1943,month:9,day:8,era:'industrial',title:'Peak Wartime Ore Production',cat:'mine',featured:false,lat:67.8520,lng:20.2310,emoji:'⚙️',
desc:"WWII drives Swedish iron ore exports to historic peaks — Sweden supplied both Allied and Axis powers. Kiruna's workforce surges and the city expands. The postwar boom sustained rapid growth into the 1960s.",
loc:'LKAB Mine — Southern Zone',coords:'67.8520°N, 20.2310°E',tags:['WWII','Strategic Resources','Industrial'],
sources:[{t:'Riksarkivet. "LKAB Archive 1940–1950." riksarkivet.se.',u:'https://www.riksarkivet.se/'},{t:'Enflo, K. Lund Univ., 2010.',u:'https://www.lusem.lu.se/'}]},
{id:5,year:1958,month:10,day:22,era:'growth',title:'City Hall (Stadshus) Inaugurated',cat:'urban',featured:true,lat:67.8555,lng:20.2305,emoji:'🏛️',
desc:"Artur von Schmalensee's iconic Kiruna Stadshus opens. Later voted Sweden's most beautiful public building, its distinctive clock tower and Sami-inspired ornamentation made it a cultural landmark.",
loc:'Town Hall Square (Stadshustorget)',coords:'67.8555°N, 20.2305°E',tags:['Architecture','Heritage','City Hall'],
sources:[{t:'Riksantikvarieämbetet. "Kiruna Stadshus." raa.se, 2023.',u:'https://www.riksantikvarieambetet.se/'},{t:'Kiruna Municipality. kiruna.se, 2024.',u:'https://kiruna.se/en/move-kiruna/'}]},
{id:6,year:1969,month:12,day:9,month:12,day:9,era:'growth',title:'The 1969 Strike',cat:'mine',featured:false,lat:67.8548,lng:20.2248,emoji:'⛏️',
desc:'Approximately 4,800 miners at LKAB staged a massive 57-day strike against a harsh rationalization and time-study system (UMS), permanently altering Swedish labor laws.',
loc:'LKAB, Kiruna',coords:'67.8548°N, 20.2248°E',tags:['Labor Strike','LKAB','UMS'],
sources:[{t:'LKAB. "Production Statistics." lkab.com, 2024.',u:'https://www.lkab.com/en/'},{t:'Bergström, A. LTU, 2010.',u:'https://www.ltu.se/'}]},
{id:7,year:1984,month:7,day:4,era:'growth',title:'Esrange Space Centre Expansion',cat:'infra',featured:false,lat:67.8860,lng:21.0640,emoji:'🚀',
desc:"The Swedish Space Corporation's Esrange facility 45 km east of Kiruna undergoes major expansion, supporting rockets, balloons and satellite tracking — Europe's northernmost commercial space hub.",
loc:'Esrange Space Centre (SSC)',coords:'67.8860°N, 21.0640°E',tags:['Space Research','ESA','Esrange'],
sources:[{t:'SSC. "Esrange Space Center." sscspace.com, 2024.',u:'https://www.sscspace.com/ssc-worldwide/esrange-space-center/'},{t:'ESA. "Esrange." esa.int, 2023.',u:'https://www.esa.int/'}]},
{id:8,year:2004,month:4,day:16,era:'relocation',title:'City Relocation Decision Adopted',cat:'urban',featured:true,lat:67.8640,lng:20.3050,emoji:'📋',
desc:"LKAB's deformation prognosis confirms 60% of Kiruna's city centre will be uninhabitable by 2033. Municipality and LKAB jointly announce the relocation of the entire city centre 3 km northeast.",
loc:'New Town Centre Site (Nya Centrum)',coords:'67.8640°N, 20.3050°E',tags:['Urban Relocation','Ground Subsidence','Historic Decision'],
sources:[{t:'Kiruna Municipality. kiruna.se, 2024.',u:'https://kiruna.se/en/move-kiruna/'},{t:'LKAB. "Deformation Prognosis 2004." lkab.com.',u:'https://www.lkab.com/en/'}]},
{id:9,year:2012,month:8,day:28,era:'relocation',title:'Old City Hall Demolished',cat:'social',featured:false,lat:67.8555,lng:20.2300,emoji:'🏗️',
desc:'The 1958 Stadshus — voted Sweden\'s most beautiful building — is demolished as the deformation zone expands. After public protest, the iconic clock tower is carefully cut free and transported intact to the new city centre, where it stands today.',
loc:'Old City Hall site (Gamla Stadshuset)',coords:'67.8555°N, 20.2300°E',tags:['Heritage','Demolition','Clock Tower','Collective Memory'],
sources:[{t:'Riksantikvarieämbetet. "Kiruna Stadshus." raa.se, 2013.',u:'https://www.riksantikvarieambetet.se/'},{t:'The Guardian. "The Mining Town Moving to Escape a Chasm." 2014.',u:'https://www.theguardian.com/cities/2014/apr/15/kiruna-sweden-city-move-iron-ore-mine'}]},
{id:10,year:2018,month:9,day:1,era:'relocation',title:'Kristallen City Hall & New Centre Open',cat:'urban',featured:true,lat:67.8620,lng:20.3080,emoji:'🏛️',
desc:'Henning Larsen Architects\' Kristallen ("The Crystal") city hall opens, anchoring the new city centre 3 km east. The building\' aurora-inspired form and Sami motifs mark the most visible milestone in the relocation.',
loc:'Kristallen City Hall, New Kiruna Centre',coords:'67.8620°N, 20.3080°E',tags:['New City','Kristallen','Henning Larsen','City Hall'],
sources:[{t:'Henning Larsen. "Kiruna City Hall." henninglarsen.com, 2018.',u:'https://henninglarsen.com/en/projects/kiruna-city-hall/'},{t:'Kiruna Municipality. kiruna.se, 2024.',u:'https://kiruna.se/en/move-kiruna/'}]},
{id:11,year:2023,month:5,day:9,era:'relocation',title:'Old Town Subsidence Milestone',cat:'env',featured:false,lat:67.8530,lng:20.2350,emoji:'📊',
desc:'Monitoring confirms cumulative ground displacement in old city has reached critical thresholds. Several historic buildings show structural cracking. Evacuation timetable shortened to 2029.',
loc:'Old Town Eastern Subsidence Zone',coords:'67.8530°N, 20.2350°E',tags:['Ground Subsidence','Geology','Monitoring'],
sources:[{t:'LTU. "Kiruna Deformation Monitoring." ltu.se, 2023.',u:'https://www.ltu.se/'},{t:'LKAB. "Sustainability Report 2023." lkab.com.',u:'https://www.lkab.com/en/sustainability/'}]},
{id:12,year:2035,month:12,day:15,era:'relocation',title:'New Kiruna: Target Completion',cat:'urban',featured:true,lat:67.8655,lng:20.3110,emoji:'🌟',
desc:'Target year for full completion of the Kiruna relocation programme. By 2035, LKAB estimates over 6,000 additional residents (beyond those already moved) will have relocated to Nya Kiruna — 3 km northeast across 30+ years.',
loc:'New Kiruna — Full District (Nya Kiruna)',coords:'67.8655°N, 20.3110°E',tags:['New City','2035 Target','Sustainability'],
sources:[{t:'Kiruna Municipality. kiruna.se, 2024.',u:'https://kiruna.se/en/move-kiruna/'},{t:'UN-Habitat. "Kiruna Case Study." unhabitat.org, 2022.',u:'https://unhabitat.org/'}]},
];

const DOCS = [
    {
      id:100, title:`Compilation of responses "So what the people of Kiruna think?" (15)`,
      stakeholders:["Kiruna kommun","Residents"],
      issuance_date:"2008", type:"Informative Doc.",
      coordinates:{type:"Point",coordinates:[20.280,67.8636]},
      description:`This document is a compilation of the responses to the survey 'What is your impression of Kiruna?' Citizens identified the Church, Hjalmar Lundbohmsgården, and the Town Hall as buildings of significant value. The municipality viewed this consultation positively and proposed various engagement opportunities over the years.`,
      tags:["Kiruna kommun","Residents","Survey","Citizens"]
    },
    {
      id:101, title:"Detail plan for Bolagsomradet Gruvstadspark (18)",
      stakeholders:["Kiruna kommun"],
      issuance_date:"2010-10-20", type:"Prescriptive Doc.",
      coordinates:{type:"Point",coordinates:[20.280,67.8636]},
      description:`First of 8 detailed plans in the old center of Kiruna, transforming residential areas into mining zones for demolition. Covers the town hall, Ullspiran district, and A10 highway. Gained legal validity in 2012.`,
      tags:["Kiruna kommun","Detailed Plan","Mining","Demolition"]
    },
    {
      id:102, title:"Development Plan (41)",
      stakeholders:["Kiruna kommun","White Arkitekter"],
      issuance_date:"2014-03-17", type:"Design Doc.",
      coordinates:{type:"Point",coordinates:[20.280,67.8636]},
      description:`The development plan shapes the new city, written in Swedish for Kiruna's citizens. Divided into four parts; the third spanning 80 pages describes the city's new form and relocation strategies through plans, sections, images, and diagrams.`,
      tags:["Kiruna kommun","White Arkitekter","Masterplan","New City"]
    },
    {
      id:103, title:"Deformation forecast (45)",
      stakeholders:["LKAB"],
      issuance_date:"2014-12", type:"Technical Doc.",
      coordinates:{type:"Point",coordinates:[20.222794,67.8440]},
      description:`LKAB's deformation forecast outlining expected ground subsidence areas and intervention timing due to the Kiirunavaara mine expansion at 1,365 m depth.`,
      tags:["LKAB","Deformation","Technical","Forecast"]
    },
    {
      id:104, title:"Construction of Scandic Hotel begins (63)",
      stakeholders:["LKAB"],
      issuance_date:"2019-04", type:"Material effect",
      coordinates:{type:"Point",coordinates:[20.304778,67.848528]},
      description:`After two extensions of the land acquisition agreement, construction of the Scandic hotel finally began in 2019 in the new city centre.`,
      tags:["LKAB","Hotel","New City","Construction"]
    },
    {
      id:105, title:"Town Hall demolition (64)",
      stakeholders:["LKAB"],
      issuance_date:"2019-04", type:"Informative Doc.",
      coordinates:{type:"Point",coordinates:[20.222444,67.852500]},
      description:`After the new town hall was completed, the old building "The Igloo" was demolished. The Sami door handles and the clock tower were preserved — the tower relocated to the central square of New Kiruna.`,
      tags:["LKAB","Demolition","Town Hall","Heritage"]
    },
    {
      id:106, title:"Construction of Aurora Center begins (65)",
      stakeholders:["LKAB"],
      issuance_date:"2019-05", type:"Material effect",
      coordinates:{type:"Point",coordinates:[20.304389,67.849167]},
      description:`Work began on the Aurora Center, a multifunctional complex including the municipal library. Connected to the Scandic hotel by a skywalk, mirroring the layout of the old city.`,
      tags:["LKAB","Aurora Center","Library","New City"]
    },
    {
      id:107, title:"Construction of Block 1 begins (69)",
      stakeholders:["LKAB"],
      issuance_date:"2019-06", type:"Material effect",
      coordinates:{type:"Point",coordinates:[20.300333,67.848167]},
      description:`Simultaneously with the Aurora Center, work began on Block 1, a mixed-use building overlooking the main square — the first residential buildings in the new town.`,
      tags:["LKAB","Residential","New City","Construction"]
    },
    {
      id:108, title:"Detail plan for square and commercial street (50)",
      stakeholders:["Kiruna kommun"],
      issuance_date:"2016-06-22", type:"Prescriptive Doc.",
      coordinates:{type:"Point",coordinates:[20.301557,67.849469]},
      description:`First detailed plan implemented from the new masterplan. Defines 9 dense blocks near the town hall, including 6 buildings facing the main square. Mixed public/private functions with residential use prominent.`,
      tags:["Kiruna kommun","Square","Commercial","Masterplan"]
    },
    {
      id:109, title:"Gruvstadspark 2, etapp 5, Kyrkan (81)",
      stakeholders:["Kiruna kommun"],
      issuance_date:"2021-09-04", type:"Prescriptive Doc.",
      coordinates:{type:"Point",coordinates:[20.232698,67.851796]},
      description:`Last detailed plan of the second planning phase, concerning the area around the Kiruna Church. Six buildings, half serving religious functions. Specifies the church will be dismantled 2025–2026 and reassembled by 2029.`,
      tags:["Kiruna kommun","Church","Gruvstadspark","Relocation"]
    },
    {
      id:110, title:"Demolition documentation, Kiruna City Hall (76)",
      stakeholders:["Norrbotten Museum"],
      issuance_date:"2020-11-26", type:"Informative Doc.",
      coordinates:{type:"Point",coordinates:[20.222444,67.852500]},
      description:`162-page study by the Norrbotten Museum analyzing the city hall's materials before demolition in April 2019 — preserving knowledge of every structural detail.`,
      tags:["Norrbotten Museum","City Hall","Documentation","Heritage"]
    },
    {
      id:111, title:"Deformation forecast (62)",
      stakeholders:["LKAB"],
      issuance_date:"2019-04", type:"Technical Doc.",
      coordinates:{type:"Point",coordinates:[20.221942,67.846742]},
      description:`Third deformation forecast published in 2019, five years after the second. The deformation line remains unchanged; what varies are intervention timing and the shape of affected zones.`,
      tags:["LKAB","Deformation","Technical","Forecast"]
    },
    {
      id:112, title:"Detailed plan for Gruvstadspark 2, etapp 3 (58)",
      stakeholders:["Kiruna kommun"],
      issuance_date:"2018-10", type:"Prescriptive Doc.",
      coordinates:{type:"Point",coordinates:[20.211515,67.857946]},
      description:`Third Detailed Plan of the second demolition phase, covering a narrow elongated area straddling the old railway. Sole designated land use is mining, temporarily used as a park during an interim phase.`,
      tags:["Kiruna kommun","Gruvstadspark","Railway","Mining"]
    },
    {
      id:113, title:"Vision 2099 (4)",
      stakeholders:["Kiruna kommun"],
      issuance_date:"2004", type:"Design Doc.",
      coordinates:{type:"Point",coordinates:[20.301557,67.849469]},
      description:`The first project document for the new city of Kiruna, created in response to LKAB's letter. Despite being presented anonymously, its principles proved fundamental in all subsequent planning documents.`,
      tags:["Kiruna kommun","Vision","2099","New City"]
    },
    {
      id:114, title:"Adjusted development plan (47)",
      stakeholders:["Kiruna kommun","White Arkitekter"],
      issuance_date:"2015", type:"Design Doc.",
      coordinates:{type:"Point",coordinates:[20.292364,67.851805]},
      description:`Update of the Development Plan one year after its creation. The central square takes its final shape; the large school complex north of it appears for the first time. Still the version in use today after 10 years.`,
      tags:["Kiruna kommun","White Arkitekter","Masterplan","Update"]
    },
    {
      id:115, title:"Detailed Overview Plan for the Central Area of Kiruna 2014 (44)",
      stakeholders:["Kiruna kommun"],
      issuance_date:"2014-06", type:"Prescriptive Doc.",
      coordinates:{type:"Point",coordinates:[20.303821,67.848695]},
      description:`Intermediate-scale planning instrument for central Kiruna. Incorporates all Development Plan projections into a prescriptive tool. Compliance is not mandatory but supports Detailed Plans.`,
      tags:["Kiruna kommun","Overview Plan","Central Area","Prescriptive"]
    },
    {
      id:116, title:"Detailed plan for LINBANAN 1 (42)",
      stakeholders:["Kiruna kommun"],
      issuance_date:"2014-03", type:"Prescriptive Doc.",
      coordinates:{type:"Point",coordinates:[20.303821,67.848695]},
      description:`First Detailed Plan for the new city center. Covers the land for a single building: Kristallen, the new Town Hall and the first building constructed in New Kiruna.`,
      tags:["Kiruna kommun","Kristallen","Town Hall","Linbanan"]
    },
    {
      id:117, title:"Mail to Kiruna kommun (2)",
      stakeholders:["LKAB"],
      issuance_date:"2004-03-19", type:"Prescriptive Doc.",
      coordinates:{type:"Point",coordinates:[20.303821,67.848695]},
      description:`The act that initiates the relocation of Kiruna. LKAB communicates its intention to construct a new mining level at 1,365 m depth and urges the municipality to begin planning the city's relocation.`,
      tags:["LKAB","Relocation","Initiating Document","Mining"]
    },
    {
      id:118, title:"Construction of new city hall begins (48)",
      stakeholders:["LKAB"],
      issuance_date:"2015", type:"Material effect",
      coordinates:{type:"Point",coordinates:[20.30310,67.84855]},
      description:`Kiruna Town Hall was the first building rebuilt in the new town center in 2015. It remained isolated for some time due to a slowdown in mining activities.`,
      tags:["LKAB","Town Hall","New City","Construction"]
    },
    {
      id:119, title:"Detail plan for square and commercial street (49)",
      stakeholders:["Kiruna kommun"],
      issuance_date:"2016-06-22", type:"Prescriptive Doc.",
      coordinates:{type:"Point",coordinates:[20.301557,67.849469]},
      description:`Approved July 2016, this is the first detailed plan implemented from the new masterplan. Defines the area near the town hall with 9 blocks, 6 facing the main square.`,
      tags:["Kiruna kommun","Masterplan","Square","New City"]
    },
    {
      id:120, title:"Detail plan for Bolagsomradet Gruvstad-spark (18b)",
      stakeholders:["Kiruna kommun"],
      issuance_date:"2010-10-20", type:"Prescriptive Doc.",
      coordinates:{type:"Point",coordinates:[20.303821,67.848695]},
      description:`One of 8 detailed plans in old Kiruna center transforming residential areas into mining zones for demolition. Gained legal validity in 2012.`,
      tags:["Kiruna kommun","Gruvstadspark","Demolition","Mining"]
    },
    {
      id:121, title:"Kiruna Church closes (102)",
      stakeholders:["LKAB"],
      issuance_date:"2024-06-02", type:"Material effect",
      coordinates:{type:"Point",coordinates:[20.23289,67.85237]},
      description:`On June 2, the Kiruna Church closed for relocation preparations following a solemn ceremony. Relocation scheduled for summer 2025, taking two days. Voted 'Sweden's most beautiful building constructed before 1950.'`,
      tags:["LKAB","Church","Relocation","Heritage"]
    },
  ];

function typeToCat(type){
  const value=String(type||'').toLowerCase();
  if(value.includes('design')||value.includes('prescriptive')||value.includes('overview'))return 'urban';
  if(value.includes('technical'))return 'mine';
  if(value.includes('material'))return 'infra';
  return 'social';
}

const EVENTS=[...CORE_EVENTS,...DOCS.map(doc=>{
  const [year,month='1',day='1']=doc.issuance_date.split('-');
  const [lng,lat]=doc.coordinates?.coordinates||[];
  if(!Number.isFinite(lat)||!Number.isFinite(lng))throw new Error(`Archive event ${doc.id} needs coordinates.`);
  const numericYear=Number(year);
  return {
    id:doc.id,year:numericYear,month:Number(month),day:Number(day),
    datePrecision:doc.issuance_date.length===10?'day':doc.issuance_date.length===7?'month':'year',
    era:numericYear<1950?'industrial':numericYear<2004?'growth':'relocation',
    cat:typeToCat(doc.type),title:doc.title,featured:false,lat,lng,emoji:'📄',
    desc:doc.description||'',loc:doc.type||'Document',
    coords:`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
    tags:doc.tags||[],stakeholders:doc.stakeholders||[],
    sources:(doc.stakeholders||[]).map(name=>({t:name,u:'#'}))
  };
})];
const ids=EVENTS.map(event=>event.id);
if(new Set(ids).size!==ids.length||EVENTS.some(event=>
  !Number.isInteger(event.id)||event.id<1||!Number.isInteger(event.year)||
  !Number.isInteger(event.month)||event.month<1||event.month>12||
  !Number.isInteger(event.day)||event.day<1||event.day>31||
  !Number.isFinite(event.lat)||Math.abs(event.lat)>90||
  !Number.isFinite(event.lng)||Math.abs(event.lng)>180||
  !['mine','urban','infra','social','env'].includes(event.cat)||!event.title||!event.desc
))throw new Error('Archive events need unique IDs, dates, coordinates, titles, and descriptions.');

return {CORE_EVENTS,DOCS,EVENTS};
})();
