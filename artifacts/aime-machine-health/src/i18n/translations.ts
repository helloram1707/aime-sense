export type SupportedLanguage = 'en' | 'te' | 'hi';

export interface Translations {
  // App branding
  appName: string;
  appFullForm: string;
  tagline: string;
  problemStatementBadge: string;
  
  // Navigation tabs
  tabOverview: string;
  tabMonitor: string;
  tabHistory: string;
  tabLab: string;
  tabGuide: string;
  tabProfile: string;

  // Language switcher
  selectLanguage: string;
  languageEn: string;
  languageTe: string;
  languageHi: string;

  // Statuses (Green / Yellow / Red)
  statusNormal: string;
  statusWarning: string;
  statusCritical: string;
  statusInsufficient: string;
  statusUnavailable: string;
  statusInvalid: string;

  // Dashboard / Overview
  dashboardTitle: string;
  registeredMachines: string;
  totalMachines: string;
  normalCount: string;
  warningCount: string;
  criticalCount: string;
  addMachine: string;
  noMachineRegistered: string;
  noMachineDetail: string;
  currentAssessment: string;
  latestRms: string;
  observedAt: string;
  recordedAlerts: string;
  baselineLabel: string;
  notEstablished: string;
  readingTheResult: string;
  deviceSensor: string;
  sensorDetected: string;
  sensorUnavailable: string;
  sensorAndroidOnly: string;

  // Machine Registration & Details
  registerMachineTitle: string;
  machineIdLabel: string;
  machineNameLabel: string;
  machineCategoryLabel: string;
  machineLocationLabel: string;
  runHoursLabel: string;
  lastServiceDateLabel: string;
  serviceIntervalLabel: string;
  hourlyDowntimeCostLabel: string;
  warningRatioLabel: string;
  criticalRatioLabel: string;
  saveMachineButton: string;
  cancelButton: string;
  editMachine: string;
  deleteMachine: string;
  confirmDeleteMachine: string;

  // Maintenance Priority Suggestions
  maintenancePrioritiesTitle: string;
  maintenanceSubtitle: string;
  priorityP1: string;
  priorityP2: string;
  priorityP3: string;
  actionRequired: string;
  suggestedTasks: string;
  checklistTitle: string;
  markCompleted: string;
  completedBadge: string;
  acknowledgeAlert: string;
  alertAcknowledged: string;

  // Downtime Cost Estimator
  downtimeEstimatorTitle: string;
  downtimeEstimatorSubtitle: string;
  hourlyRate: string;
  estimatedHours: string;
  estimatedRiskCost: string;
  preventiveCost: string;
  estimatedSavings: string;
  calculateButton: string;
  downtimeDisclaimer: string;

  // Early Warning Indicators
  earlyWarningTitle: string;
  earlyWarningSubtitle: string;
  vibrationTrend: string;
  thresholdProximity: string;
  stableTrend: string;
  risingTrend: string;
  acceleratingTrend: string;
  operatorNotesLabel: string;
  logOperatorObservation: string;
  auditoryNotice: string;
  thermalNotice: string;
  looseMountNotice: string;

  // Monitoring
  captureWindow: string;
  startLiveCapture: string;
  capturingLive: string;
  latestLiveSample: string;
  confirmReferenceCondition: string;
  establishBaseline: string;
  replaceBaseline: string;
  accelerometerNotice: string;

  // Future Sensor Integration
  futureSensorTitle: string;
  futureSensorSubtitle: string;
  bleSensor: string;
  wifiSensor: string;
  mqttTopic: string;
  sensorNodeStatus: string;
  simulateExternalSensor: string;
  ingestEndpoint: string;

  // History & CSV
  measurementHistory: string;
  exportCsv: string;
  exportingCsv: string;
  machineFilter: string;
  noHistory: string;

  // Validation Lab
  validationLabTitle: string;
  runSimulation: string;
  simNormal: string;
  simElevated: string;
  simCritical: string;
  importCsv: string;

  // Auth & Profile
  welcomeTitle: string;
  welcomeSubtitle: string;
  createAccount: string;
  signIn: string;
  signOut: string;
  demoMode: string;
  workshopName: string;
  fullName: string;
  emailAddress: string;
  password: string;
}

export const translations: Record<SupportedLanguage, Translations> = {
  en: {
    appName: 'AIME Sense',
    appFullForm: 'Affordable Intelligent Machine Evaluation',
    tagline: 'Affordable Machine Health Monitoring',
    problemStatementBadge: 'NIT Andhra Pradesh IIC · RTIH Challenge',

    tabOverview: 'Dashboard',
    tabMonitor: 'Monitor',
    tabHistory: 'History',
    tabLab: 'Test Lab',
    tabGuide: 'Guide & Sensors',
    tabProfile: 'Profile',

    selectLanguage: 'Language',
    languageEn: 'English',
    languageTe: 'తెలుగు (Telugu)',
    languageHi: 'हिन्दी (Hindi)',

    statusNormal: 'Normal · Healthy',
    statusWarning: 'Warning · Check',
    statusCritical: 'Critical · Action',
    statusInsufficient: 'Insufficient Data',
    statusUnavailable: 'Sensor Unavailable',
    statusInvalid: 'Invalid Data',

    dashboardTitle: 'Machine Health Overview',
    registeredMachines: 'Registered Machines',
    totalMachines: 'Total Machines',
    normalCount: 'Healthy (Green)',
    warningCount: 'Warning (Yellow)',
    criticalCount: 'Critical (Red)',
    addMachine: 'Register Machine',
    noMachineRegistered: 'No machine registered',
    noMachineDetail: 'Add a motor, pump, compressor, or lathe to start monitoring.',
    currentAssessment: 'Current Machine Assessment',
    latestRms: 'Latest RMS',
    observedAt: 'Observed',
    recordedAlerts: 'Recorded Alerts',
    baselineLabel: 'Reference Baseline',
    notEstablished: 'Not established',
    readingTheResult: 'Understanding the RMS Result',
    deviceSensor: 'Device Sensor',
    sensorDetected: 'Phone Accelerometer Ready',
    sensorUnavailable: 'Sensor Unavailable on this Device',
    sensorAndroidOnly: 'Available on Android devices',

    registerMachineTitle: 'Register a Machine',
    machineIdLabel: 'Machine Tag / ID',
    machineNameLabel: 'Machine Name',
    machineCategoryLabel: 'Category (Motor, Pump, CNC, etc.)',
    machineLocationLabel: 'Shop Floor Location',
    runHoursLabel: 'Operating Run Hours (hrs)',
    lastServiceDateLabel: 'Last Service Date (YYYY-MM-DD)',
    serviceIntervalLabel: 'Service Interval (Hours)',
    hourlyDowntimeCostLabel: 'Hourly Downtime Cost (₹/hr)',
    warningRatioLabel: 'Warning Threshold Ratio (e.g. 1.5)',
    criticalRatioLabel: 'Critical Threshold Ratio (e.g. 2.0)',
    saveMachineButton: 'Save Machine Details',
    cancelButton: 'Cancel',
    editMachine: 'Edit Details',
    deleteMachine: 'Remove Machine',
    confirmDeleteMachine: 'Are you sure you want to remove this machine?',

    maintenancePrioritiesTitle: 'Maintenance Priority Suggestions',
    maintenanceSubtitle: 'Rule-based prioritization derived from vibration alerts and service hours.',
    priorityP1: 'P1: Immediate Action Required',
    priorityP2: 'P2: Scheduled Service Recommended',
    priorityP3: 'P3: Routine Inspection Pending',
    actionRequired: 'Recommended Maintenance Actions',
    suggestedTasks: 'Suggested Inspection Checklist',
    checklistTitle: 'Operator Maintenance Checklist',
    markCompleted: 'Mark Inspection Complete',
    completedBadge: 'Completed',
    acknowledgeAlert: 'Acknowledge Alert',
    alertAcknowledged: 'Acknowledged',

    downtimeEstimatorTitle: 'Downtime Cost Estimator',
    downtimeEstimatorSubtitle: 'Estimate breakdown loss vs. preventive maintenance savings.',
    hourlyRate: 'Production Loss Rate (₹/hr)',
    estimatedHours: 'Est. Outage Duration (hrs)',
    estimatedRiskCost: 'Estimated Breakdown Risk',
    preventiveCost: 'Preventive Service Cost',
    estimatedSavings: 'Estimated Net Savings (ROI)',
    calculateButton: 'Recalculate Estimate',
    downtimeDisclaimer: 'Screening cost estimate based on user-entered hourly production rates and current health risk.',

    earlyWarningTitle: 'Early Warning Indicators',
    earlyWarningSubtitle: 'Detect subtle vibration drift and operator sensory flags before critical failure.',
    vibrationTrend: 'Vibration Drift Trend',
    thresholdProximity: 'Threshold Proximity Index',
    stableTrend: 'Stable · Within Baseline Bounds',
    risingTrend: 'Elevated Drift · +15% over Baseline',
    acceleratingTrend: 'Accelerating Drift · Approaching Warning Limit',
    operatorNotesLabel: 'Operator Sensory Observations',
    logOperatorObservation: 'Log Physical Observation',
    auditoryNotice: 'Abnormal grinding or squealing noise',
    thermalNotice: 'Excessive surface casing temperature',
    looseMountNotice: 'Loose foundation or mounting bolts',

    captureWindow: 'Capture Measurement Window',
    startLiveCapture: 'Start 4-Second Live Capture',
    capturingLive: 'Collecting sensor samples…',
    latestLiveSample: 'Live Sensor Window',
    confirmReferenceCondition: 'I confirm the machine is in a stable, normal reference operating condition.',
    establishBaseline: 'Establish Baseline from Window',
    replaceBaseline: 'Update Machine Baseline',
    accelerometerNotice: 'Hold phone firmly against the machine bearing or housing during capture.',

    futureSensorTitle: 'External Sensor Integration Plan',
    futureSensorSubtitle: 'Architecture and endpoints for future BLE, MQTT, and WiFi industrial vibration nodes.',
    bleSensor: 'BLE Industrial Accelerometer (e.g. ADXL355)',
    wifiSensor: 'ESP32 / WiFi Sensor Node',
    mqttTopic: 'MQTT Telemetry Topic: aime/machines/{id}/vibration',
    sensorNodeStatus: 'Ingestion Pipeline Status',
    simulateExternalSensor: 'Test External Sensor Ingest API',
    ingestEndpoint: 'REST API: POST /api/sensors/ingest',

    measurementHistory: 'Measurement History & Audit',
    exportCsv: 'Export CSV',
    exportingCsv: 'Generating CSV file…',
    machineFilter: 'Filter by Machine',
    noHistory: 'No measurements recorded yet.',

    validationLabTitle: 'Validation & Testing Laboratory',
    runSimulation: 'Generate Demo Window',
    simNormal: 'Simulate Normal Window',
    simElevated: 'Simulate Warning Window',
    simCritical: 'Simulate Critical Window',
    importCsv: 'Import Measurement CSV',

    welcomeTitle: 'Know when a machine needs attention.',
    welcomeSubtitle: 'Affordable, explainable machine-health screening for small manufacturing units.',
    createAccount: 'Create Account',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    demoMode: 'Explore Interactive Demo',
    workshopName: 'Workshop / Unit Name',
    fullName: 'Operator / Engineer Name',
    emailAddress: 'Email Address',
    password: 'Password',
  },

  te: {
    appName: 'AIME సెన్స్ (AIME Sense)',
    appFullForm: 'అందుబాటు ధరలో ఇంటెలిజెంట్ మెషిన్ మూల్యాంకనం',
    tagline: 'తక్కువ ఖర్చుతో యంత్ర ఆరోగ్య పర్యవేక్షణ',
    problemStatementBadge: 'NIT ఆంధ్రప్రదేశ్ IIC · RTIH ఛాలెంజ్',

    tabOverview: 'డాష్‌బోర్డ్',
    tabMonitor: 'పర్యవేక్షణ',
    tabHistory: 'చరిత్ర',
    tabLab: 'ల్యాబ్ టెస్ట్',
    tabGuide: 'గైడ్ & సెన్సార్లు',
    tabProfile: 'ప్రొఫైల్',

    selectLanguage: 'భాష (Language)',
    languageEn: 'English (ఇంగ్లీష్)',
    languageTe: 'తెలుగు (Telugu)',
    languageHi: 'हिन्दी (హిందీ)',

    statusNormal: 'సాధారణం · క్షేమం (ఆకుపచ్చ)',
    statusWarning: 'హెచ్చరిక · గమనించండి (పసుపు)',
    statusCritical: 'తీవ్రమైనది · తక్షణ చర్య (ఎరుపు)',
    statusInsufficient: 'సరిపడా డేటా లేదు',
    statusUnavailable: 'సెన్సార్ అందుబాటులో లేదు',
    statusInvalid: 'చెల్లని డేటా',

    dashboardTitle: 'యంత్ర ఆరోగ్య వివరాలు',
    registeredMachines: 'నమోదైన యంత్రాలు',
    totalMachines: 'మొత్తం యంత్రాలు',
    normalCount: 'క్షేమం (ఆకుపచ్చ)',
    warningCount: 'హెచ్చరిక (పసుపు)',
    criticalCount: 'తీవ్రమైనది (ఎరుపు)',
    addMachine: 'యంత్రాన్ని నమోదు చేయండి',
    noMachineRegistered: 'ఏ యంత్రం నమోదు కాలేదు',
    noMachineDetail: 'మోటార్, పంపు లేదా ఇతర యంత్రాన్ని జోడించండి.',
    currentAssessment: 'ప్రస్తుత యంత్ర మూల్యాంకనం',
    latestRms: 'తాజా RMS కంపనం',
    observedAt: 'సమయం',
    recordedAlerts: 'నమోదైన అలర్టులు',
    baselineLabel: 'ఆధార ప్రమాణం (Baseline)',
    notEstablished: 'నిర్ధారించబడలేదు',
    readingTheResult: 'ఫలితాన్ని అర్థం చేసుకోవడం',
    deviceSensor: 'ఫోన్ సెన్సార్',
    sensorDetected: 'యాక్సిలెరోమీటర్ సిద్ధంగా ఉంది',
    sensorUnavailable: 'సెన్సార్ అందుబాటులో లేదు',
    sensorAndroidOnly: 'ఆండ్రాయిడ్ ఫోన్లలో అందుబాటులో ఉంటుంది',

    registerMachineTitle: 'యంత్రం నమోదు వివరాలు',
    machineIdLabel: 'యంత్రం ఐడీ (ID)',
    machineNameLabel: 'యంత్రం పేరు',
    machineCategoryLabel: 'రకం (మోటార్, పంపు, లాత్)',
    machineLocationLabel: 'వర్క్‌షాప్ ప్రాంతం',
    runHoursLabel: 'పనిచేసిన గంటలు (Run Hours)',
    lastServiceDateLabel: 'చివరి సర్వీస్ తేదీ (YYYY-MM-DD)',
    serviceIntervalLabel: 'సర్వీస్ విరామ గంటలు (Hours)',
    hourlyDowntimeCostLabel: 'గంట నిలిపివేత నష్టం (₹/గంట)',
    warningRatioLabel: 'హెచ్చరిక పరిమితి (ఉదా: 1.5)',
    criticalRatioLabel: 'తీవ్ర పరిమితి (ఉదా: 2.0)',
    saveMachineButton: 'వివరాలను భద్రపరచండి',
    cancelButton: 'రద్దు చేయండి',
    editMachine: 'సవరించండి',
    deleteMachine: 'తొలగించండి',
    confirmDeleteMachine: 'ఈ యంత్రాన్ని ఖచ్చితంగా తొలగించాలనుకుంటున్నారా?',

    maintenancePrioritiesTitle: 'నిర్వహణ ప్రాధాన్యత సూచనలు',
    maintenanceSubtitle: 'కంపన అలర్టులు మరియు సర్వీస్ గంటల ఆధారంగా రూపొందించిన సూచనలు.',
    priorityP1: 'P1: తక్షణ చర్య అవసరం',
    priorityP2: 'P2: సర్వీస్ చేయించవలసిన సమయం',
    priorityP3: 'P3: సాధారణ తనిఖీ పెండింగ్',
    actionRequired: 'సూచించిన నిర్వహణ చర్యలు',
    suggestedTasks: 'తనిఖీ చెక్‌లిస్ట్',
    checklistTitle: 'ఆపరేటర్ తనిఖీ జాబితా',
    markCompleted: 'తనిఖీ పూర్తయినట్లు గుర్తించు',
    completedBadge: 'పూర్తయింది',
    acknowledgeAlert: 'అలర్ట్ గుర్తించండి',
    alertAcknowledged: 'గుర్తించబడింది',

    downtimeEstimatorTitle: 'యంత్రం నిలిపివేత వ్యయ అంచనా',
    downtimeEstimatorSubtitle: 'ఆకస్మిక బ్రేక్‌డౌన్ నష్టం vs ముందస్తు నిర్వహణ ఆదా.',
    hourlyRate: 'ఉత్పత్తి నష్ట రేటు (₹/గంట)',
    estimatedHours: 'అంచనా మరమ్మతు సమయం (గంటలు)',
    estimatedRiskCost: 'ఆకస్మిక బ్రేక్‌డౌన్ ప్రమాద వ్యయం',
    preventiveCost: 'ముందస్తు నిర్వహణ ఖర్చు',
    estimatedSavings: 'అంచనా నికర ఆదా (ROI)',
    calculateButton: 'తిరిగి లెక్కించండి',
    downtimeDisclaimer: 'యూజర్ నమోదు చేసిన ఉత్పత్తి నష్ట రేటు మరియు ఆరోగ్య స్థితి ఆధారంగా అంచనా వేయబడింది.',

    earlyWarningTitle: 'ముందస్తు హెచ్చరిక సూచికలు',
    earlyWarningSubtitle: 'తీవ్రమైన వైఫల్యం రాకముందే స్వల్ప కంపన మార్పులను గుర్తించండి.',
    vibrationTrend: 'కంపన పెరుగుదల ధోరణి',
    thresholdProximity: 'పరిమితి సామీప్య సూచిక',
    stableTrend: 'స్థిరమైనది · బేస్‌లైన్ పరిధిలో ఉంది',
    risingTrend: 'పెరుగుతున్న కంపనం · బేస్‌లైన్ కంటే +15%',
    acceleratingTrend: 'వేగంగా పెరుగుతోంది · హెచ్చరిక పరిమితికి సమీపంలో ఉంది',
    operatorNotesLabel: 'ఆపరేటర్ ప్రత్యక్ష పరిశీలనలు',
    logOperatorObservation: 'పరిశీలనను నమోదు చేయండి',
    auditoryNotice: 'అసాధారణ శబ్దం లేదా రాపిడి వినబడుతోంది',
    thermalNotice: 'బాహ్య ఉపరితలం అధిక వేడిగా ఉంది',
    looseMountNotice: 'ఫౌండేషన్ లేదా బోల్టులు వదులుగా ఉన్నాయి',

    captureWindow: 'కొలత విండో నమోదు',
    startLiveCapture: '4-సెకన్ల కొలతను ప్రారంభించండి',
    capturingLive: 'సెన్సార్ డేటా సేకరిస్తోంది…',
    latestLiveSample: 'తాజా కొలత విండో',
    confirmReferenceCondition: 'యంత్రం స్థిరమైన, సాధారణ స్థితిలో ఉందని నేను ధృవీకరిస్తున్నాను.',
    establishBaseline: 'దీనిని ఆధార ప్రమాణంగా (Baseline) నిర్ణయించండి',
    replaceBaseline: 'ఆధార ప్రమాణాన్ని నవీకరించండి',
    accelerometerNotice: 'కొలిచే సమయంలో ఫోన్‌ను యంత్రంపై గట్టిగా పట్టుకోండి.',

    futureSensorTitle: 'బాహ్య సెన్సార్ ఇంటిగ్రేషన్ ప్లాన్',
    futureSensorSubtitle: 'BLE, MQTT, మరియు WiFi సెన్సార్ల అనుసంధాన ఆర్కిటెక్చర్.',
    bleSensor: 'BLE ఇండస్ట్రియల్ యాక్సిలెరోమీటర్',
    wifiSensor: 'ESP32 / WiFi సెన్సార్ నోడ్',
    mqttTopic: 'MQTT టెలిమెట్రీ టాపిక్: aime/machines/{id}/vibration',
    sensorNodeStatus: 'ఇంజెషన్ పైప్‌లైన్ స్థితి',
    simulateExternalSensor: 'బాహ్య సెన్సార్ డేటాను పరీక్షించండి',
    ingestEndpoint: 'REST API: POST /api/sensors/ingest',

    measurementHistory: 'కొలతల చరిత్ర',
    exportCsv: 'CSV ఎగుమతి చేయండి',
    exportingCsv: 'CSV ఫైల్ తయారవుతోంది…',
    machineFilter: 'యంత్రం ప్రకారం ఫిల్టర్',
    noHistory: 'ఇంకా కొలతలు నమోదు కాలేదు.',

    validationLabTitle: 'పరీక్షా ప్రయోగశాల (Validation Lab)',
    runSimulation: 'డెమో విండో సృష్టించండి',
    simNormal: 'సాధారణ విండో అనుకరణ',
    simElevated: 'హెచ్చరిక విండో అనుకరణ',
    simCritical: 'తీవ్ర విండో అనుకరణ',
    importCsv: 'CSV ఫైల్ దిగుమతి',

    welcomeTitle: 'యంత్ర ఆరోగ్యాన్ని సులభంగా తెలుసుకోండి.',
    welcomeSubtitle: 'చిన్న పరిశ్రమల కోసం సరసమైన ధరలో యంత్ర ఆరోగ్య పర్యవేక్షణ వ్యవస్థ.',
    createAccount: 'ఖాతాను సృష్టించండి',
    signIn: 'లాగిన్ అవ్వండి',
    signOut: 'లాగౌట్',
    demoMode: 'డెమో చూడండి',
    workshopName: 'వర్క్‌షాప్ / ఫ్యాక్టరీ పేరు',
    fullName: 'ఆపరేటర్ / ఇంజనీర్ పేరు',
    emailAddress: 'ఈమెయిల్ చిరునామా',
    password: 'పాస్‌వర్డ్',
  },

  hi: {
    appName: 'AIME सेंस (AIME Sense)',
    appFullForm: 'किफायती इंटेलिजेंट मशीन मूल्यांकन',
    tagline: 'किफायती मशीन स्वास्थ्य निगरानी',
    problemStatementBadge: 'NIT आंध्र प्रदेश IIC · RTIH चैलेंज',

    tabOverview: 'डैशबोर्ड',
    tabMonitor: 'मॉनिटर',
    tabHistory: 'इतिहास',
    tabLab: 'टेस्ट लैब',
    tabGuide: 'गाइड और सेंसर',
    tabProfile: 'प्रोफाइल',

    selectLanguage: 'भाषा (Language)',
    languageEn: 'English (अंग्रेज़ी)',
    languageTe: 'తెలుగు (तेलुगु)',
    languageHi: 'हिन्दी (Hindi)',

    statusNormal: 'सामान्य · स्वस्थ (हरा)',
    statusWarning: 'चेतावनी · ध्यान दें (पीला)',
    statusCritical: 'गंभीर · तत्काल कार्रवाई (लाल)',
    statusInsufficient: 'अपर्याप्त डेटा',
    statusUnavailable: 'सेंसर अनुपलब्ध',
    statusInvalid: 'अमान्य डेटा',

    dashboardTitle: 'मशीन स्वास्थ्य अवलोकन',
    registeredMachines: 'पंजीकृत मशीनें',
    totalMachines: 'कुल मशीनें',
    normalCount: 'स्वस्थ (हरा)',
    warningCount: 'चेतावनी (पीला)',
    criticalCount: 'गंभीर (लाल)',
    addMachine: 'मशीन जोड़ें',
    noMachineRegistered: 'कोई मशीन पंजीकृत नहीं है',
    noMachineDetail: 'निगरानी शुरू करने के लिए मोटर, पंप या खराद जोड़ें।',
    currentAssessment: 'वर्तमान मशीन स्थिति',
    latestRms: 'नवीनतम RMS कंपन',
    observedAt: 'समय',
    recordedAlerts: 'दर्ज अलर्ट',
    baselineLabel: 'संदर्भ बेसलाइन',
    notEstablished: 'स्थापित नहीं है',
    readingTheResult: 'RMS परिणाम को समझना',
    deviceSensor: 'डिवाइस सेंसर',
    sensorDetected: 'फोन एक्सेलेरोमीटर तैयार है',
    sensorUnavailable: 'इस डिवाइस पर सेंसर उपलब्ध नहीं है',
    sensorAndroidOnly: 'एंड्रॉइड डिवाइस पर उपलब्ध है',

    registerMachineTitle: 'मशीन पंजीकरण विवरण',
    machineIdLabel: 'मशीन आईडी (ID)',
    machineNameLabel: 'मशीन का नाम',
    machineCategoryLabel: 'श्रेणी (मोटर, पंप, सीएनसी आदि)',
    machineLocationLabel: 'कार्यशाला स्थान',
    runHoursLabel: 'संचालन घंटे (Run Hours)',
    lastServiceDateLabel: 'अंतिम सर्विस तिथि (YYYY-MM-DD)',
    serviceIntervalLabel: 'सर्विस अंतराल (घंटे)',
    hourlyDowntimeCostLabel: 'प्रति घंटा रुकावट लागत (₹/घंटा)',
    warningRatioLabel: 'चेतावनी सीमा अनुपात (उदा: 1.5)',
    criticalRatioLabel: 'गंभीर सीमा अनुपात (उदा: 2.0)',
    saveMachineButton: 'मशीन विवरण सहेजें',
    cancelButton: 'रद्द करें',
    editMachine: 'संपादित करें',
    deleteMachine: 'मशीन हटाएं',
    confirmDeleteMachine: 'क्या आप निश्चित रूप से इस मशीन को हटाना चाहते हैं?',

    maintenancePrioritiesTitle: 'रखरखाव प्राथमिकता सुझाव',
    maintenanceSubtitle: 'कंपन अलर्ट और सेवा घंटों पर आधारित प्राथमिकताएं।',
    priorityP1: 'P1: तत्काल कार्रवाई आवश्यक',
    priorityP2: 'P2: निर्धारित सर्विस की सिफारिश',
    priorityP3: 'P3: नियमित निरीक्षण लंबित',
    actionRequired: 'अनुशंसित रखरखाव कार्य',
    suggestedTasks: 'निरीक्षण चेकलिस्ट',
    checklistTitle: 'ऑपरेटर रखरखाव चेकलिस्ट',
    markCompleted: 'निरीक्षण पूर्ण चिह्नित करें',
    completedBadge: 'पूर्ण हुआ',
    acknowledgeAlert: 'अलर्ट स्वीकारें',
    alertAcknowledged: 'स्वीकृत',

    downtimeEstimatorTitle: 'डाउनटाइम लागत अनुमानक',
    downtimeEstimatorSubtitle: 'अचानक ब्रेकडाउन हानि बनाम निवारक रखरखाव बचत।',
    hourlyRate: 'उत्पादन हानि दर (₹/घंटा)',
    estimatedHours: 'अनुमानित मरम्मत समय (घंटे)',
    estimatedRiskCost: 'अनुमानित ब्रेकडाउन जोखिम लागत',
    preventiveCost: 'निवारक रखरखाव लागत',
    estimatedSavings: 'अनुमानित शुद्ध बचत (ROI)',
    calculateButton: 'पुनः गणना करें',
    downtimeDisclaimer: 'उपयोगकर्ता द्वारा दर्ज उत्पादन दर और स्वास्थ्य स्थिति पर आधारित स्क्रीनिंग अनुमान।',

    earlyWarningTitle: 'प्रारंभिक चेतावनी संकेतक',
    earlyWarningSubtitle: 'गंभीर खराबी से पहले सूक्ष्म कंपन वृद्धि और संवेदी संकेतों का पता लगाएं।',
    vibrationTrend: 'कंपन वृद्धि प्रवृत्ति',
    thresholdProximity: 'सीमा निकटता सूचकांक',
    stableTrend: 'स्थिर · बेसलाइन सीमा के भीतर',
    risingTrend: 'बढ़ा हुआ कंपन · बेसलाइन से +15%',
    acceleratingTrend: 'तेजी से बढ़ता कंपन · चेतावनी सीमा के करीब',
    operatorNotesLabel: 'ऑपरेटर शारीरिक अवलोकन',
    logOperatorObservation: 'अवलोकन दर्ज करें',
    auditoryNotice: 'असामान्य घर्षण या तेज आवाज सुनाई दे रही है',
    thermalNotice: 'बाहरी सतह अत्यधिक गर्म है',
    looseMountNotice: 'फाउंडेशन या माउंटिंग बोल्ट ढीले हैं',

    captureWindow: 'माप विंडो कैप्चर करें',
    startLiveCapture: '4-सेकंड का लाइव माप शुरू करें',
    capturingLive: 'सेंसर डेटा एकत्र किया जा रहा है…',
    latestLiveSample: 'लाइव सेंसर विंडो',
    confirmReferenceCondition: 'मैं पुष्टि करता हूं कि मशीन सामान्य, स्थिर संदर्भ स्थिति में है।',
    establishBaseline: 'विंडो से बेसलाइन स्थापित करें',
    replaceBaseline: 'मशीन बेसलाइन अपडेट करें',
    accelerometerNotice: 'माप के दौरान फोन को मशीन पर मजबूती से पकड़ें।',

    futureSensorTitle: 'बाहरी सेंसर एकीकरण योजना',
    futureSensorSubtitle: 'BLE, MQTT और WiFi औद्योगिक सेंसर नोड्स का आर्किटेक्चर।',
    bleSensor: 'BLE औद्योगिक एक्सेलेरोमीटर',
    wifiSensor: 'ESP32 / WiFi सेंसर नोड',
    mqttTopic: 'MQTT टेलीमेट्री विषय: aime/machines/{id}/vibration',
    sensorNodeStatus: 'इंजेस्ट पाइपलाइन स्थिति',
    simulateExternalSensor: 'बाहरी सेंसर डेटा का परीक्षण करें',
    ingestEndpoint: 'REST API: POST /api/sensors/ingest',

    measurementHistory: 'माप इतिहास और ऑडिट',
    exportCsv: 'CSV निर्यात करें',
    exportingCsv: 'CSV फाइल तैयार हो रही है…',
    machineFilter: 'मशीन द्वारा फिल्टर',
    noHistory: 'अभी तक कोई माप दर्ज नहीं किया गया है।',

    validationLabTitle: 'सत्यापन प्रयोगशाला (Validation Lab)',
    runSimulation: 'डेमो विंडो उत्पन्न करें',
    simNormal: 'सामान्य विंडो अनुकरण',
    simElevated: 'चेतावनी विंडो अनुकरण',
    simCritical: 'गंभीर विंडो अनुकरण',
    importCsv: 'CSV फाइल आयात करें',

    welcomeTitle: 'मशीन स्वास्थ्य की सही जानकारी।',
    welcomeSubtitle: 'छोटी निर्माण इकाइयों के लिए किफायती और व्यावहारिक मशीन स्वास्थ्य निगरानी प्रणाली।',
    createAccount: 'खाता बनाएं',
    signIn: 'लॉग इन करें',
    signOut: 'लॉग आउट',
    demoMode: 'इंटरैक्टिव डेमो देखें',
    workshopName: 'कार्यशाला / यूनिट का नाम',
    fullName: 'ऑपरेटर / इंजीनियर का नाम',
    emailAddress: 'ईमेल पता',
    password: 'पासवर्ड',
  },
};
