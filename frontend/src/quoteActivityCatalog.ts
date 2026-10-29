// Quotes are short, source-checked excerpts. Spanish renderings are editorial
// translations. Activities are Modo Cultiva suggestions, not the authors' advice.
export type BankLanguage = 'es' | 'en' | 'zh' | 'hi' | 'ar' | 'it' | 'pt' | 'ru' | 'de' | 'fr' | 'da';
type Source = { author: string; title: string; url: string };
export const bankSources: Record<string, Source> = {
  jobs: { author: 'Steve Jobs', title: 'Stanford Commencement, 2005', url: 'https://news.stanford.edu/stories/2005/06/youve-got-find-love-jobs-says' },
  robbins: { author: 'Tony Robbins', title: 'How to focus better', url: 'https://live.tonyrobbins.com/how-to-focus' },
  teresa: { author: 'Mother Teresa', title: 'Nobel Lecture, 1979', url: 'https://www.nobelprize.org/prizes/peace/1979/teresa/lecture/' },
  emerson: { author: 'Ralph Waldo Emerson', title: 'Essays, First Series, 1841', url: 'https://www.gutenberg.org/files/2944/2944-h/2944-h.htm' },
  walden: { author: 'Henry David Thoreau', title: 'Walden, 1854', url: 'https://www.gutenberg.org/files/205/205-h/205-h.htm' },
  walking: { author: 'Henry David Thoreau', title: 'Walking, 1862', url: 'https://www.gutenberg.org/files/1022/1022-h/1022-h.htm' },
  franklin: { author: 'Benjamin Franklin', title: 'The Way to Wealth, 1758', url: 'https://www.gutenberg.org/files/43855/43855-h/43855-h.htm' },
  epictetus: { author: 'Epictetus', title: 'Enchiridion · T. W. Higginson translation', url: 'https://www.gutenberg.org/cache/epub/45109/pg45109-images.html' },
};
export type BankQuote = { id: string; source: string; locator: string; en: string; es: string };
export const bankQuotes: BankQuote[] = [
  { id: 'work', source: 'jobs', locator: 'Second story', en: 'The only way to do great work is to love what you do.', es: 'La única forma de hacer un gran trabajo es amar lo que haces.' },
  { id: 'time', source: 'jobs', locator: 'Third story (excerpt)', en: 'Your time is limited', es: 'Tu tiempo es limitado' },
  { id: 'seek', source: 'jobs', locator: 'Second story', en: 'Keep looking. Don’t settle.', es: 'Sigue buscando. No te conformes.' },
  { id: 'focus', source: 'robbins', locator: 'Opening quotation', en: 'Where focus goes, energy flows', es: 'Donde va la atención, fluye la energía' },
  { id: 'home', source: 'teresa', locator: 'Nobel Lecture (excerpt)', en: 'Love begins at home', es: 'El amor comienza en casa' },
  { id: 'smile', source: 'teresa', locator: 'Closing paragraph (excerpt)', en: 'the smile is the beginning of love', es: 'la sonrisa es el comienzo del amor' },
  { id: 'trust', source: 'emerson', locator: 'Self-Reliance', en: 'Trust thyself: every heart vibrates to that iron string.', es: 'Confía en ti: cada corazón vibra con esa cuerda de hierro.' },
  { id: 'friend', source: 'emerson', locator: 'Friendship (excerpt)', en: 'the only way to have a friend is to be one.', es: 'la única forma de tener un amigo es serlo.' },
  { id: 'kindness', source: 'emerson', locator: 'Friendship', en: 'We have a great deal more kindness than is ever spoken.', es: 'Tenemos mucha más bondad de la que llegamos a expresar.' },
  { id: 'peace', source: 'emerson', locator: 'Self-Reliance', en: 'Nothing can bring you peace but yourself.', es: 'Nada puede darte paz salvo tú mismo.' },
  { id: 'sincere', source: 'emerson', locator: 'Friendship', en: 'A friend is a person with whom I may be sincere.', es: 'Un amigo es alguien con quien puedo ser sincero.' },
  { id: 'enthusiasm', source: 'emerson', locator: 'Circles', en: 'Nothing great was ever achieved without enthusiasm.', es: 'Nunca se logró nada grande sin entusiasmo.' },
  { id: 'experiment', source: 'emerson', locator: 'Circles (excerpt)', en: 'I simply experiment, an endless seeker', es: 'Simplemente experimento, como un buscador sin fin' },
  { id: 'simple', source: 'walden', locator: 'Where I Lived, and What I Lived For', en: 'Simplify, simplify.', es: 'Simplifica, simplifica.' },
  { id: 'deliberate', source: 'walden', locator: 'Where I Lived, and What I Lived For (excerpt)', en: 'I wished to live deliberately', es: 'Quería vivir deliberadamente' },
  { id: 'awake', source: 'walden', locator: 'Where I Lived, and What I Lived For', en: 'To be awake is to be alive.', es: 'Estar despierto es estar vivo.' },
  { id: 'rhythm', source: 'walden', locator: 'Conclusion', en: 'Let him step to the music which he hears, however measured or far away.', es: 'Que camine al compás de la música que oye, por pausada o lejana que sea.' },
  { id: 'truth', source: 'walden', locator: 'Conclusion', en: 'Rather than love, than money, than fame, give me truth.', es: 'Antes que amor, dinero o fama, dame verdad.' },
  { id: 'wild', source: 'walking', locator: 'Walking (excerpt)', en: 'all good things are wild and free.', es: 'todas las cosas buenas son libres y silvestres.' },
  { id: 'cost', source: 'walden', locator: 'Economy (excerpt)', en: 'the cost of a thing is the amount of what I will call life which is required to be exchanged for it', es: 'el costo de algo es la cantidad de lo que llamaré vida que hay que entregar a cambio' },
  { id: 'lost', source: 'franklin', locator: 'Part I (excerpt)', en: 'Lost time is never found again', es: 'El tiempo perdido nunca se recupera' },
  { id: 'leak', source: 'franklin', locator: 'Part III', en: 'A small leak will sink a great ship', es: 'Una pequeña fuga hundirá un gran barco' },
  { id: 'strokes', source: 'franklin', locator: 'Part I (excerpt)', en: 'little strokes fell great oaks.', es: 'pequeños golpes derriban grandes robles.' },
  { id: 'water', source: 'franklin', locator: 'Part III', en: 'When the well is dry, they know the worth of water.', es: 'Cuando el pozo se seca, conocen el valor del agua.' },
  { id: 'business', source: 'franklin', locator: 'Part I (excerpt)', en: 'Drive thy business, let not that drive thee', es: 'Dirige tus asuntos; no dejes que ellos te dirijan' },
  { id: 'control', source: 'epictetus', locator: 'I', en: 'There are things which are within our power, and there are things which are beyond our power.', es: 'Hay cosas que están en nuestro poder y cosas que están fuera de él.' },
  { id: 'views', source: 'epictetus', locator: 'V', en: 'Men are disturbed not by things, but by the views which they take of things.', es: 'Las personas no se alteran por las cosas, sino por la visión que tienen de ellas.' },
  { id: 'listen', source: 'epictetus', locator: 'XXXIII (excerpt)', en: 'speak merely what is needful, and in few words.', es: 'di solo lo necesario y con pocas palabras.' },
];

// Ten intentional quote / activity pairings per mode. A quote can support more
// than one life area; every deck contains ten different quotes and topics.
type Pair = [quote: string, en: string, es: string];
export const bankPairings: Record<string, Pair[]> = {
  fisico: [ ['awake','Body awareness','Conciencia corporal'], ['wild','Outdoor movement','Movimiento al aire libre'], ['rhythm','Comfortable movement','Movimiento a tu ritmo'], ['simple','A calmer rest space','Un espacio de descanso más tranquilo'], ['water','Everyday hydration habits','Hábitos cotidianos de hidratación'], ['focus','Attention during movement','Atención al moverte'], ['strokes','A movement routine','Una rutina de movimiento'], ['time','Protected rest time','Tiempo protegido para descansar'], ['experiment','Enjoyable ways to move','Formas de moverte que disfrutas'], ['control','A realistic wellbeing routine','Una rutina de bienestar realista'] ],
  intelectual: [ ['seek','A question worth exploring','Una pregunta que merece explorarse'], ['experiment','Testing an idea','Poner a prueba una idea'], ['focus','Reading without distractions','Lectura sin distracciones'], ['truth','Checking an information source','Verificar una fuente de información'], ['listen','Learning from another viewpoint','Aprender de otra perspectiva'], ['strokes','A learning routine','Una rutina de aprendizaje'], ['simple','Explaining a complex idea simply','Explicar una idea compleja con sencillez'], ['awake','Noticing something unfamiliar','Observar algo desconocido'], ['trust','Developing your own argument','Desarrollar un argumento propio'], ['deliberate','Choosing what to study','Elegir qué estudiar'] ],
  emocional: [ ['views','Separating feelings from interpretations','Separar emociones e interpretaciones'], ['control','What you can influence today','Lo que puedes influir hoy'], ['peace','A calming pause','Una pausa de calma'], ['focus','Noticing an emotion','Reconocer una emoción'], ['sincere','Expressing a feeling honestly','Expresar un sentimiento con honestidad'], ['kindness','A kinder inner dialogue','Un diálogo interno más amable'], ['rhythm','Time to process a feeling','Tiempo para procesar una emoción'], ['simple','Reducing a daily source of friction','Reducir una fricción cotidiana'], ['listen','Listening before responding','Escuchar antes de responder'], ['experiment','Trying a reflective practice','Probar una práctica de reflexión'] ],
  arquetipico: [ ['trust','A value you choose to live by','Un valor que eliges vivir'], ['truth','Consistency between words and actions','Coherencia entre palabras y acciones'], ['deliberate','A deliberate everyday choice','Una elección cotidiana consciente'], ['control','A personal commitment','Un compromiso personal'], ['sincere','Showing up authentically','Mostrarte con autenticidad'], ['rhythm','Respecting your own path','Respetar tu propio camino'], ['seek','Revisiting an inherited belief','Revisar una creencia heredada'], ['experiment','Exploring a new way of being','Explorar una nueva forma de ser'], ['strokes','A habit that reflects your values','Un hábito que refleja tus valores'], ['kindness','Expressing your values through care','Expresar tus valores a través del cuidado'] ],
  espiritual: [ ['deliberate','What gives this day meaning','Lo que da sentido a este día'], ['peace','A moment of quiet','Un momento de quietud'], ['awake','Being present in ordinary life','Estar presente en lo cotidiano'], ['wild','Connection with nature','Conexión con la naturaleza'], ['home','Care as a meaningful practice','El cuidado como práctica con sentido'], ['kindness','An act of service','Un acto de servicio'], ['control','Making room for uncertainty','Dar espacio a la incertidumbre'], ['trust','Listening to your convictions','Escuchar tus convicciones'], ['simple','Making space for contemplation','Crear espacio para contemplar'], ['listen','Listening without rushing','Escuchar sin prisa'] ],
  romantico: [ ['home','Care in your close relationship','Cuidado en tu relación cercana'], ['sincere','An honest conversation','Una conversación honesta'], ['listen','Listening to your partner','Escuchar a tu pareja'], ['kindness','Expressing appreciation','Expresar agradecimiento'], ['smile','A warm moment together','Un momento cálido juntos'], ['time','Protected time together','Tiempo protegido juntos'], ['rhythm','Respecting each other’s pace','Respetar el ritmo de cada persona'], ['truth','Clarifying a shared expectation','Aclarar una expectativa compartida'], ['control','A commitment within your control','Un compromiso que depende de ti'], ['friend','Being a supportive companion','Ser una compañía que apoya'] ],
  familiar: [ ['home','Presence with your family','Presencia con tu familia'], ['kindness','A gesture of family care','Un gesto de cuidado familiar'], ['listen','Listening to a family story','Escuchar una historia familiar'], ['smile','Enjoying a simple family moment','Disfrutar un momento familiar sencillo'], ['sincere','A respectful family conversation','Una conversación familiar respetuosa'], ['time','Making time for a close relative','Hacer tiempo para un familiar cercano'], ['strokes','A dependable family ritual','Un ritual familiar constante'], ['control','A healthy personal boundary','Un límite personal sano'], ['friend','Offering practical support','Ofrecer apoyo práctico'], ['deliberate','Choosing a family priority','Elegir una prioridad familiar'] ],
  social: [ ['friend','Being present for a friend','Estar presente para una amistad'], ['kindness','Expressing unspoken appreciation','Expresar un agradecimiento pendiente'], ['listen','An attentive conversation','Una conversación atenta'], ['sincere','An authentic connection','Una conexión auténtica'], ['smile','A welcoming gesture','Un gesto de bienvenida'], ['time','Making time for your support network','Dedicar tiempo a tu red de apoyo'], ['home','Creating a welcoming shared space','Crear un espacio compartido acogedor'], ['strokes','A consistent friendship ritual','Un ritual de amistad constante'], ['experiment','Trying a community activity','Probar una actividad comunitaria'], ['control','A contribution you can offer','Una contribución a tu alcance'] ],
  financiero: [ ['leak','Noticing small recurring expenses','Observar pequeños gastos recurrentes'], ['cost','The time behind a purchase','El tiempo detrás de una compra'], ['simple','Simplifying a spending record','Simplificar un registro de gastos'], ['control','A spending choice you control','Una decisión de gasto que controlas'], ['water','Planning for an unexpected expense','Planear un gasto imprevisto'], ['business','A regular money review','Una revisión periódica del dinero'], ['strokes','An affordable saving habit','Un hábito de ahorro a tu alcance'], ['focus','A clear resource priority','Una prioridad clara para tus recursos'], ['deliberate','A deliberate purchase decision','Una compra deliberada'], ['time','The time spent managing money','El tiempo que dedicas a gestionar dinero'] ],
  profesional: [ ['work','Work you find meaningful','Trabajo que tiene sentido para ti'], ['focus','Focused work time','Tiempo de trabajo enfocado'], ['business','Taking ownership of your workload','Gestionar tu carga de trabajo'], ['seek','A professional skill to develop','Una habilidad profesional por desarrollar'], ['strokes','Steady progress on a task','Avance constante en una tarea'], ['listen','Listening to useful feedback','Escuchar retroalimentación útil'], ['truth','Evidence of your contribution','Evidencia de tu contribución'], ['experiment','Testing a better workflow','Probar una mejor forma de trabajar'], ['time','Protecting time for priority work','Proteger tiempo para el trabajo prioritario'], ['enthusiasm','A project that motivates you','Un proyecto que te motiva'] ],
  ludico: [ ['wild','A simple outdoor break','Una pausa sencilla al aire libre'], ['rhythm','Playing at your own pace','Jugar a tu propio ritmo'], ['enthusiasm','An activity you genuinely enjoy','Una actividad que disfrutas'], ['experiment','Trying a playful creative idea','Probar una idea creativa lúdica'], ['simple','Screen-free leisure','Ocio sin pantallas'], ['awake','Enjoying a sensory moment','Disfrutar un momento sensorial'], ['time','Protecting time for rest','Proteger tiempo para descansar'], ['smile','Sharing a lighthearted moment','Compartir un momento alegre'], ['friend','Playing with someone','Jugar con alguien'], ['deliberate','Choosing restorative leisure','Elegir un ocio que te renueva'] ],
  visionario: [ ['time','A priority for your future','Una prioridad para tu futuro'], ['focus','A clear long-term goal','Una meta clara a largo plazo'], ['seek','Exploring a possible future','Explorar un futuro posible'], ['deliberate','Choosing a direction deliberately','Elegir un rumbo conscientemente'], ['strokes','A small milestone','Un pequeño hito'], ['experiment','Testing a future possibility','Poner a prueba una posibilidad futura'], ['trust','A vision that reflects your values','Una visión que refleja tus valores'], ['simple','Clarifying your next step','Aclarar tu siguiente paso'], ['business','Organizing resources for a goal','Organizar recursos para una meta'], ['enthusiasm','A contribution you want to leave','Una contribución que quieres dejar'] ],
};

// Exact levels, not the slide index, determine duration and cadence for ALL ten
// choices. Each practice now leads toward the NEXT clarity description: response,
// awareness, first action, minimum routine, stability, direction, measured growth,
// optimization/delegation and teaching. Completion never guarantees progression.
// The existing level-9 catalog entry is retained for compatibility; its UI is image-only.
const levelSteps: Record<BankLanguage, string[]> = {
  "es": [
    "Dedica 2 minutos hoy a reconocer una necesidad relacionada con {topic}. Escribe una respuesta pequeña que darías cuando aparezca esa necesidad.",
    "Dedica 3 minutos hoy a nombrar el problema que notas en {topic} y la barrera que todavía te impide hacer un plan. Registra lo que ahora comprendes.",
    "Dedica 5 minutos hoy a probar un primer paso pequeño y sin costo para {topic}. Anota qué hiciste y qué te ayudaría a intentarlo de nuevo.",
    "Reserva 10 minutos, dos veces esta semana, para practicar {topic} en un horario fijo. Registra ambas sesiones y la señal que te ayuda a repetirlas.",
    "Mantén tres sesiones de 15 minutos esta semana para {topic}. Comprueba que tu rutina mínima se sostiene y registra cómo conservarás esa estabilidad.",
    "Dedica 15 minutos a investigar una mejora para {topic}. Define una meta concreta fuera de tu zona de confort y asigna tiempo y energía para dar el primer paso.",
    "Practica {topic} durante 30 minutos semanales por cuatro semanas. Mide un resultado, revísalo cada semana y ajusta una variable a partir de lo observado.",
    "Dedica 45 minutos esta semana a optimizar {topic}. Prueba una automatización o delegación acordada, con recursos a tu alcance; compara dos ejecuciones y documenta qué mejora.",
    "Dedica 45 minutos a convertir tu experiencia en {topic} en una guía práctica. Acompaña a alguien que quiera aprender, recoge su retroalimentación y mejora la guía.",
    "Documenta lo que has aprendido sobre {topic}. Comparte una guía breve con alguien que la quiera recibir y revísala en un mes."
  ],
  "en": [
    "Take 2 minutes today to recognize one need related to {topic}. Write one small response you could make when that need appears.",
    "Take 3 minutes today to name the problem you notice in {topic} and the barrier still preventing a plan. Record what you now understand.",
    "Take 5 minutes today to try one small, free first step for {topic}. Note what you did and what would help you try again.",
    "Schedule 10 minutes twice this week to practice {topic} at a fixed time. Record both sessions and the cue that helps you repeat them.",
    "Keep three 15-minute sessions this week for {topic}. Check that your minimum routine holds and record how you will preserve that stability.",
    "Spend 15 minutes researching an improvement for {topic}. Set one concrete goal beyond your comfort zone and allocate time and energy for its first step.",
    "Practice {topic} for 30 minutes weekly for four weeks. Measure one result, review it weekly and adjust one variable based on what you observe.",
    "Spend 45 minutes this week optimizing {topic}. Try an automation or agreed delegation within your means; compare two runs and document what improves.",
    "Spend 45 minutes turning your experience with {topic} into a practical guide. Support someone who wants to learn, gather their feedback and improve the guide.",
    "Document what you have learned about {topic}. Share a short guide with someone who wants it and review it in a month."
  ],
  "zh": [
    "今天用2分钟识别与{topic}有关的一个需求。写下当这个需求出现时，你能做出的一个小回应。",
    "今天用3分钟说清你在{topic}中发现的问题，以及仍然阻碍你制定计划的因素。记录你现在的理解。",
    "今天用5分钟为{topic}尝试一个免费的小步骤。记录做了什么，以及什么能帮助你再次尝试。",
    "本周在固定时间安排两次10分钟来实践{topic}。记录两次实践，以及帮助你重复它的提示。",
    "本周为{topic}保持三次15分钟的实践。确认最小日常安排能够持续，并记录如何保持稳定。",
    "用15分钟研究如何改进{topic}。设定一个超出舒适区的具体目标，为第一步安排时间和精力。",
    "连续四周，每周用30分钟实践{topic}。衡量一项结果，每周回顾，并根据观察调整一个变量。",
    "本周用45分钟优化{topic}。在能力范围内试用自动化或协商好的委托；比较两次执行并记录改进。",
    "用45分钟把你在{topic}方面的经验整理成实用指南。指导一位愿意学习的人，收集反馈并改进指南。",
    "记录你对{topic}的所学，向愿意了解的人分享简短指南，一个月后回顾。"
  ],
  "hi": [
    "आज 2 मिनट में {topic} से जुड़ी एक ज़रूरत पहचानें। उस ज़रूरत के आने पर आप क्या छोटा जवाब दे सकते हैं, लिखें।",
    "आज 3 मिनट में {topic} की समस्या और योजना बनाने से रोक रही बाधा को नाम दें। अब आप क्या समझते हैं, दर्ज करें।",
    "आज 5 मिनट में {topic} के लिए एक छोटा, मुफ़्त पहला कदम आज़माएँ। क्या किया और फिर कोशिश करने में क्या मदद करेगा, लिखें।",
    "इस सप्ताह तय समय पर दो बार 10 मिनट {topic} का अभ्यास करें। दोनों सत्र और दोहराने में मदद करने वाला संकेत दर्ज करें।",
    "इस सप्ताह {topic} के तीन 15 मिनट के सत्र बनाए रखें। जाँचें कि न्यूनतम दिनचर्या टिकती है और स्थिरता बनाए रखने का तरीका लिखें।",
    "15 मिनट में {topic} सुधारने की खोज करें। सहज दायरे से बाहर एक ठोस लक्ष्य और पहले कदम के लिए समय व ऊर्जा तय करें।",
    "चार सप्ताह तक हर सप्ताह 30 मिनट {topic} का अभ्यास करें। एक परिणाम मापें, साप्ताहिक समीक्षा करें और अवलोकन के अनुसार एक बदलाव करें।",
    "इस सप्ताह 45 मिनट में {topic} बेहतर करें। उपलब्ध संसाधनों में स्वचालन या सहमति से काम सौंपना आज़माएँ; दो बार के परिणाम की तुलना और सुधार दर्ज करें।",
    "45 मिनट में {topic} का अनुभव एक व्यावहारिक मार्गदर्शिका में बदलें। सीखने के इच्छुक व्यक्ति की मदद करें, प्रतिक्रिया लें और मार्गदर्शिका सुधारें।",
    "{topic} से मिली सीख लिखें। इच्छुक व्यक्ति को छोटी मार्गदर्शिका दें और एक महीने बाद समीक्षा करें।"
  ],
  "ar": [
    "خصّص دقيقتين اليوم للتعرّف على حاجة تخص {topic}. اكتب استجابة صغيرة يمكنك تقديمها عند ظهور تلك الحاجة.",
    "خصّص 3 دقائق اليوم لتسمية المشكلة التي تلاحظها في {topic} والعائق الذي ما زال يمنعك من وضع خطة. سجّل ما فهمته الآن.",
    "جرّب اليوم خطوة أولى صغيرة ومجانية لـ {topic} لمدة 5 دقائق. دوّن ما فعلته وما قد يساعدك على المحاولة مجدداً.",
    "خصّص 10 دقائق مرتين هذا الأسبوع في موعد ثابت لممارسة {topic}. سجّل الجلستين والإشارة التي تساعدك على التكرار.",
    "حافظ على ثلاث جلسات من 15 دقيقة هذا الأسبوع لـ {topic}. تأكّد من ثبات روتينك الأدنى وسجّل كيف ستحافظ على استقراره.",
    "خصّص 15 دقيقة لبحث تحسين في {topic}. حدّد هدفاً ملموساً خارج منطقة راحتك وخصّص وقتاً وطاقة للخطوة الأولى.",
    "مارس {topic} لمدة 30 دقيقة أسبوعياً لأربعة أسابيع. قِس نتيجة وراجعها أسبوعياً وعدّل متغيراً بناءً على ملاحظاتك.",
    "خصّص 45 دقيقة هذا الأسبوع لتحسين {topic}. جرّب أتمتة أو تفويضاً متفقاً عليه ضمن إمكاناتك؛ قارن تنفيذين ووثّق التحسّن.",
    "حوّل خبرتك في {topic} إلى دليل عملي خلال 45 دقيقة. رافق شخصاً يرغب في التعلّم واجمع ملاحظاته وحسّن الدليل.",
    "وثّق ما تعلّمته عن {topic}. شارك دليلاً قصيراً مع شخص يرغب فيه وراجعه بعد شهر."
  ],
  "it": [
    "Dedica 2 minuti oggi a riconoscere un bisogno legato a {topic}. Scrivi una piccola risposta da dare quando compare.",
    "Dedica 3 minuti oggi a nominare il problema che noti in {topic} e l’ostacolo che impedisce ancora un piano. Annota ciò che ora comprendi.",
    "Dedica 5 minuti oggi a provare un primo passo piccolo e gratuito per {topic}. Annota cosa hai fatto e cosa ti aiuterebbe a riprovare.",
    "Dedica 10 minuti due volte questa settimana a praticare {topic} a un orario fisso. Registra entrambe le sessioni e il segnale che aiuta a ripeterle.",
    "Mantieni tre sessioni di 15 minuti questa settimana per {topic}. Verifica che la routine minima regga e annota come preservarne la stabilità.",
    "Dedica 15 minuti a cercare un miglioramento per {topic}. Definisci un obiettivo concreto oltre la tua zona di comfort e assegna tempo ed energia al primo passo.",
    "Pratica {topic} per 30 minuti a settimana per quattro settimane. Misura un risultato, rivedilo ogni settimana e modifica una variabile in base alle osservazioni.",
    "Dedica 45 minuti questa settimana a ottimizzare {topic}. Prova un’automazione o una delega concordata sostenibile; confronta due esecuzioni e documenta i miglioramenti.",
    "Dedica 45 minuti a trasformare la tua esperienza con {topic} in una guida pratica. Affianca chi desidera imparare, raccogli il suo riscontro e migliora la guida.",
    "Documenta ciò che hai imparato su {topic}. Condividi una breve guida con chi la desidera e rivedila tra un mese."
  ],
  "pt": [
    "Dedique 2 minutos hoje a reconhecer uma necessidade ligada a {topic}. Escreva uma pequena resposta para quando essa necessidade surgir.",
    "Dedique 3 minutos hoje a nomear o problema em {topic} e a barreira que ainda impede um plano. Registre o que você compreende agora.",
    "Dedique 5 minutos hoje a experimentar um primeiro passo pequeno e gratuito para {topic}. Anote o que fez e o que ajudaria a tentar de novo.",
    "Reserve 10 minutos duas vezes nesta semana para praticar {topic} em horário fixo. Registre as duas sessões e o sinal que ajuda a repeti-las.",
    "Mantenha três sessões de 15 minutos nesta semana para {topic}. Verifique se a rotina mínima se sustenta e registre como preservar essa estabilidade.",
    "Dedique 15 minutos a pesquisar uma melhoria para {topic}. Defina uma meta concreta além da zona de conforto e reserve tempo e energia para o primeiro passo.",
    "Pratique {topic} por 30 minutos semanais durante quatro semanas. Meça um resultado, reveja-o semanalmente e ajuste uma variável com base no observado.",
    "Dedique 45 minutos nesta semana a otimizar {topic}. Teste automação ou delegação combinada dentro das suas possibilidades; compare duas execuções e documente a melhoria.",
    "Dedique 45 minutos a transformar sua experiência em {topic} em um guia prático. Acompanhe alguém que queira aprender, recolha sua avaliação e melhore o guia.",
    "Documente o que aprendeu sobre {topic}. Compartilhe um guia breve com quem desejar e revise em um mês."
  ],
  "ru": [
    "Уделите сегодня 2 минуты распознаванию одной потребности по теме {topic}. Запишите небольшой ответ на её появление.",
    "За 3 минуты назовите проблему, которую видите в теме {topic}, и барьер, мешающий составить план. Запишите, что теперь понимаете.",
    "Уделите сегодня 5 минут небольшому бесплатному первому шагу по теме {topic}. Запишите, что сделали и что поможет попробовать снова.",
    "Запланируйте два занятия по 10 минут в фиксированное время на этой неделе по теме {topic}. Отметьте оба занятия и сигнал для повторения.",
    "Сохраните три занятия по 15 минут на этой неделе по теме {topic}. Проверьте устойчивость минимальной рутины и запишите, как её поддержать.",
    "За 15 минут изучите улучшение для {topic}. Поставьте конкретную цель за пределами зоны комфорта и выделите время и силы на первый шаг.",
    "Практикуйте {topic} по 30 минут в неделю четыре недели. Измеряйте результат, еженедельно проверяйте его и корректируйте одну переменную.",
    "За 45 минут на этой неделе оптимизируйте {topic}. Попробуйте доступную автоматизацию или согласованное делегирование; сравните два выполнения и опишите улучшения.",
    "За 45 минут превратите опыт по теме {topic} в практическое руководство. Помогите желающему учиться, соберите обратную связь и улучшите руководство.",
    "Запишите опыт по теме {topic}. Поделитесь кратким руководством с желающим и пересмотрите его через месяц."
  ],
  "de": [
    "Nimm dir heute 2 Minuten, um einen Bedarf zu {topic} zu erkennen. Notiere eine kleine Reaktion, wenn dieser Bedarf auftritt.",
    "Benenne heute in 3 Minuten das Problem bei {topic} und die Hürde, die einen Plan noch verhindert. Halte fest, was du nun verstehst.",
    "Probiere heute 5 Minuten lang einen kleinen, kostenlosen ersten Schritt für {topic}. Notiere, was du getan hast und was einen neuen Versuch erleichtert.",
    "Übe {topic} diese Woche zweimal 10 Minuten zu festen Zeiten. Notiere beide Einheiten und den Auslöser, der dir beim Wiederholen hilft.",
    "Behalte diese Woche drei Einheiten von 15 Minuten für {topic} bei. Prüfe, ob deine Mindestroutine hält, und notiere, wie du sie stabil hältst.",
    "Recherchiere 15 Minuten lang eine Verbesserung für {topic}. Setze ein konkretes Ziel außerhalb deiner Komfortzone und plane Zeit und Energie für den ersten Schritt.",
    "Übe {topic} vier Wochen lang wöchentlich 30 Minuten. Miss ein Ergebnis, prüfe es jede Woche und passe eine Variable anhand deiner Beobachtung an.",
    "Optimiere {topic} diese Woche 45 Minuten lang. Erprobe eine machbare Automatisierung oder vereinbarte Delegation; vergleiche zwei Durchläufe und dokumentiere Verbesserungen.",
    "Mache deine Erfahrung mit {topic} in 45 Minuten zu einer praktischen Anleitung. Begleite jemanden, der lernen möchte, hole Rückmeldung ein und verbessere die Anleitung.",
    "Dokumentiere deine Erfahrungen zu {topic}. Teile eine kurze Anleitung mit Interessierten und prüfe sie nach einem Monat."
  ],
  "fr": [
    "Prenez 2 minutes aujourd’hui pour reconnaître un besoin lié à {topic}. Notez une petite réponse à apporter quand ce besoin apparaît.",
    "Prenez 3 minutes aujourd’hui pour nommer le problème dans {topic} et l’obstacle qui empêche encore un plan. Notez ce que vous comprenez désormais.",
    "Essayez aujourd’hui un premier pas petit et gratuit pour {topic} pendant 5 minutes. Notez ce que vous avez fait et ce qui aiderait à recommencer.",
    "Pratiquez {topic} deux fois 10 minutes cette semaine à heure fixe. Notez les deux séances et le repère qui aide à les répéter.",
    "Maintenez trois séances de 15 minutes cette semaine pour {topic}. Vérifiez que la routine minimale tient et notez comment préserver cette stabilité.",
    "Cherchez pendant 15 minutes une amélioration pour {topic}. Fixez un objectif concret hors de votre zone de confort et prévoyez temps et énergie pour le premier pas.",
    "Pratiquez {topic} pendant 30 minutes par semaine durant quatre semaines. Mesurez un résultat, revoyez-le chaque semaine et ajustez une variable selon vos observations.",
    "Optimisez {topic} pendant 45 minutes cette semaine. Essayez une automatisation ou une délégation convenue selon vos moyens ; comparez deux exécutions et documentez l’amélioration.",
    "Transformez votre expérience de {topic} en guide pratique pendant 45 minutes. Accompagnez une personne volontaire, recueillez son retour et améliorez le guide.",
    "Documentez vos acquis sur {topic}. Partagez un bref guide avec une personne intéressée et révisez-le dans un mois."
  ],
  "da": [
    "Brug 2 minutter i dag på at genkende ét behov om {topic}. Skriv en lille reaktion, du kan give, når behovet opstår.",
    "Brug 3 minutter i dag på at navngive problemet ved {topic} og den hindring, der endnu stopper en plan. Notér, hvad du nu forstår.",
    "Prøv i dag et lille, gratis første skridt for {topic} i 5 minutter. Notér, hvad du gjorde, og hvad der kan hjælpe dig med at prøve igen.",
    "Øv {topic} to gange 10 minutter denne uge på faste tidspunkter. Notér begge sessioner og det tegn, der hjælper med at gentage dem.",
    "Behold tre sessioner på 15 minutter denne uge for {topic}. Tjek, at din minimumsrutine holder, og notér, hvordan du bevarer stabiliteten.",
    "Undersøg i 15 minutter en forbedring for {topic}. Sæt et konkret mål uden for din komfortzone, og afsæt tid og energi til første skridt.",
    "Øv {topic} i 30 minutter ugentligt i fire uger. Mål ét resultat, gennemgå det ugentligt, og justér én variabel ud fra dine observationer.",
    "Optimer {topic} i 45 minutter denne uge. Prøv en overkommelig automatisering eller aftalt uddelegering; sammenlign to forløb, og dokumentér forbedringen.",
    "Brug 45 minutter på at gøre din erfaring med {topic} til en praktisk guide. Hjælp en person, der vil lære, indhent feedback, og forbedr guiden.",
    "Dokumentér hvad du har lært om {topic}. Del en kort guide med en interesseret person, og gennemgå den om en måned."
  ]
};

// Same ten topics, in the same curated order, for the other supported languages.
const topicTranslations: Partial<Record<BankLanguage, Record<string, string>>> = {
  zh: {
    fisico: '身体觉察|户外活动|舒适的运动|安静的休息空间|日常饮水习惯|运动时的专注|运动习惯|受保护的休息时间|喜欢的运动方式|切实的健康习惯',
    intelectual: '值得探索的问题|检验想法|无干扰阅读|核实信息来源|学习不同观点|学习习惯|简单解释复杂想法|观察陌生事物|形成自己的论点|选择学习内容',
    emocional: '区分情绪和解释|今天能影响的事|平静的停顿|觉察情绪|诚实表达感受|友善的自我对话|处理情绪的时间|减少日常摩擦|回应前先倾听|尝试反思练习',
    arquetipico: '选择践行的价值观|言行一致|有意识的日常选择|个人承诺|真实表达自己|尊重自己的道路|审视继承的信念|探索新的生活方式|体现价值观的习惯|通过关怀表达价值观',
    espiritual: '一天的意义|安静的时刻|活在日常当下|与自然连接|有意义的关怀|服务他人的行动|容纳不确定性|倾听自己的信念|为沉思留空间|从容倾听',
    romantico: '亲密关系中的关怀|诚实的对话|倾听伴侣|表达感激|共同的温暖时刻|专属的相处时间|尊重彼此节奏|明确共同期望|力所能及的承诺|成为支持他人的伴侣',
    familiar: '陪伴家人|关爱家人的举动|倾听家庭故事|享受简单的家庭时刻|尊重的家庭对话|陪伴亲人的时间|稳定的家庭仪式|健康的个人界限|提供实际支持|选择家庭优先事项',
    social: '陪伴朋友|表达未说出的感激|专心对话|真实的连接|欢迎他人的举动|支持网络的时间|友善的共享空间|稳定的友谊仪式|尝试社区活动|力所能及的贡献',
    financiero: '观察小额固定开支|购买背后的时间|简化支出记录|可控的消费选择|意外开支计划|定期财务回顾|可负担的储蓄习惯|明确资源优先事项|有意识的购买|财务管理的时间',
    profesional: '有意义的工作|专注的工作时间|管理工作量|待发展的职业技能|持续推进任务|倾听有用反馈|贡献的证据|测试更好的工作流程|保护重要工作的时间|激励自己的项目',
    ludico: '简单的户外休息|按自己的节奏玩耍|喜欢的活动|尝试有趣的创意|无屏幕休闲|感官享受的时刻|保护休息时间|分享快乐时刻|与他人玩耍|恢复精力的休闲',
    visionario: '未来的优先事项|清晰的长期目标|探索可能的未来|有意识地选择方向|小的里程碑|测试未来的可能性|体现价值观的愿景|明确下一步|为目标组织资源|想留下的贡献',
  },
  hi: {
    fisico: 'शरीर के प्रति जागरूकता|बाहर की गतिविधि|सहज गति|शांत विश्राम स्थान|पानी पीने की आदतें|गतिविधि में ध्यान|गतिविधि की दिनचर्या|विश्राम का सुरक्षित समय|आनंददायक गतिविधि|व्यावहारिक स्वास्थ्य दिनचर्या',
    intelectual: 'खोजने योग्य सवाल|विचार की जाँच|बिना व्यवधान पढ़ना|जानकारी के स्रोत की जाँच|दूसरा दृष्टिकोण सीखना|सीखने की दिनचर्या|जटिल विचार की सरल व्याख्या|अपरिचित चीज़ देखना|अपना तर्क बनाना|अध्ययन का विषय चुनना',
    emocional: 'भावना और व्याख्या में अंतर|आज आपके प्रभाव की बातें|शांत विराम|भावना को पहचानना|ईमानदारी से भाव व्यक्त करना|दयालु आत्म-संवाद|भावना समझने का समय|दैनिक तनाव घटाना|जवाब से पहले सुनना|चिंतन का अभ्यास',
    arquetipico: 'जीने योग्य मूल्य|कथनी और करनी में मेल|सचेत दैनिक चुनाव|व्यक्तिगत प्रतिबद्धता|प्रामाणिक अभिव्यक्ति|अपनी राह का सम्मान|पुरानी मान्यता की समीक्षा|नया जीवन ढंग|मूल्यों वाली आदत|देखभाल के माध्यम से मूल्य',
    espiritual: 'दिन का अर्थ|शांति का क्षण|वर्तमान में उपस्थिति|प्रकृति से संबंध|अर्थपूर्ण देखभाल|सेवा का कार्य|अनिश्चितता के लिए जगह|अपनी आस्था सुनना|चिंतन के लिए जगह|बिना जल्दी सुनना',
    romantico: 'रिश्ते की देखभाल|ईमानदार बातचीत|साथी को सुनना|आभार व्यक्त करना|साथ का स्नेहपूर्ण क्षण|साथ के लिए समय|एक-दूसरे की गति का सम्मान|साझी अपेक्षा स्पष्ट करना|अपने बस की प्रतिबद्धता|सहायक साथी बनना',
    familiar: 'परिवार के साथ उपस्थिति|परिवार की देखभाल|परिवार की कहानी सुनना|सरल पारिवारिक क्षण|सम्मानपूर्ण पारिवारिक बातचीत|प्रिय परिजन के लिए समय|स्थिर पारिवारिक परंपरा|स्वस्थ व्यक्तिगत सीमा|व्यावहारिक सहयोग|पारिवारिक प्राथमिकता',
    social: 'मित्र के साथ उपस्थिति|अनकहा आभार व्यक्त करना|ध्यानपूर्वक बातचीत|प्रामाणिक संबंध|स्वागत का संकेत|सहयोगी नेटवर्क का समय|स्वागतयोग्य साझा जगह|स्थिर मित्रता की परंपरा|सामुदायिक गतिविधि|अपने बस का योगदान',
    financiero: 'छोटे नियमित खर्च|खरीद के पीछे का समय|सरल खर्च रिकॉर्ड|अपने नियंत्रण का खर्च|अप्रत्याशित खर्च की योजना|नियमित धन समीक्षा|सुलभ बचत की आदत|संसाधनों की प्राथमिकता|सचेत खरीद|धन प्रबंधन का समय',
    profesional: 'अर्थपूर्ण काम|एकाग्र काम का समय|कार्यभार का प्रबंधन|पेशेवर कौशल|काम में नियमित प्रगति|उपयोगी प्रतिक्रिया सुनना|योगदान का प्रमाण|बेहतर कार्यप्रवाह|प्राथमिक काम का समय|प्रेरक परियोजना',
    ludico: 'बाहर छोटा विराम|अपनी गति से खेलना|आनंददायक गतिविधि|खेलपूर्ण रचनात्मक प्रयोग|स्क्रीन रहित अवकाश|इंद्रियों का आनंद|विश्राम का समय|खुशगवार क्षण साझा करना|किसी के साथ खेलना|ऊर्जा लौटाने वाला अवकाश',
    visionario: 'भविष्य की प्राथमिकता|स्पष्ट दीर्घकालिक लक्ष्य|संभावित भविष्य|सचेत दिशा का चुनाव|छोटा पड़ाव|भविष्य की संभावना जाँचना|मूल्यों वाली दृष्टि|अगला कदम स्पष्ट करना|लक्ष्य के संसाधन|छोड़ने योग्य योगदान',
  },
  ar: {
    fisico: 'الوعي بالجسم|الحركة في الهواء الطلق|الحركة المريحة|مكان هادئ للراحة|عادات شرب الماء|الانتباه أثناء الحركة|روتين الحركة|وقت محمي للراحة|حركة تستمتع بها|روتين واقعي للعافية',
    intelectual: 'سؤال يستحق الاستكشاف|اختبار فكرة|قراءة بلا مشتتات|التحقق من مصدر|التعلم من منظور آخر|روتين التعلم|شرح فكرة معقدة ببساطة|ملاحظة شيء غير مألوف|تطوير حجة خاصة بك|اختيار ما تتعلمه',
    emocional: 'فصل المشاعر عن التفسيرات|ما يمكنك التأثير فيه اليوم|وقفة هادئة|ملاحظة شعور|التعبير الصادق عن شعور|حوار داخلي ألطف|وقت لمعالجة شعور|تقليل احتكاك يومي|الاستماع قبل الرد|ممارسة التأمل الذاتي',
    arquetipico: 'قيمة تختار أن تعيش بها|اتساق الأقوال والأفعال|اختيار يومي واع|التزام شخصي|إظهار ذاتك بصدق|احترام مسارك|مراجعة اعتقاد موروث|استكشاف طريقة جديدة للعيش|عادة تعكس قيمك|التعبير عن القيم بالرعاية',
    espiritual: 'معنى هذا اليوم|لحظة سكون|الحضور في الحياة اليومية|التواصل مع الطبيعة|الرعاية ذات المعنى|عمل خدمي|مساحة لعدم اليقين|الاستماع لقناعاتك|فسحة للتأمل|الاستماع دون عجلة',
    romantico: 'رعاية العلاقة القريبة|حوار صادق|الاستماع للشريك|التعبير عن التقدير|لحظة دافئة معاً|وقت محمي معاً|احترام إيقاع كل شخص|توضيح توقع مشترك|التزام في نطاق سيطرتك|أن تكون رفيقاً داعماً',
    familiar: 'الحضور مع الأسرة|لفتة رعاية أسرية|الاستماع لقصة عائلية|لحظة أسرية بسيطة|حوار أسري محترم|وقت لقريب عزيز|طقس أسري منتظم|حد شخصي صحي|تقديم دعم عملي|اختيار أولوية أسرية',
    social: 'الحضور لصديق|التعبير عن تقدير غير معلن|حوار بانتباه|تواصل صادق|لفتة ترحيب|وقت لشبكة الدعم|مساحة مشتركة مرحبة|طقس صداقة منتظم|نشاط مجتمعي|مساهمة في متناولك',
    financiero: 'مصاريف صغيرة متكررة|الوقت وراء الشراء|تبسيط سجل المصاريف|قرار إنفاق تتحكم فيه|التخطيط لنفقة طارئة|مراجعة مالية دورية|عادة ادخار ميسورة|أولوية واضحة للموارد|قرار شراء واع|وقت إدارة المال',
    profesional: 'عمل ذو معنى|وقت عمل مركّز|إدارة عبء العمل|مهارة مهنية للتطوير|تقدم منتظم في مهمة|الاستماع لملاحظات مفيدة|دليل على مساهمتك|اختبار سير عمل أفضل|حماية وقت العمل المهم|مشروع يحفزك',
    ludico: 'استراحة بسيطة في الخارج|اللعب بإيقاعك|نشاط تستمتع به|فكرة إبداعية مرحة|ترفيه بلا شاشات|الاستمتاع بلحظة حسية|حماية وقت الراحة|مشاركة لحظة مرحة|اللعب مع شخص|ترفيه يجدد الطاقة',
    visionario: 'أولوية للمستقبل|هدف طويل الأجل واضح|استكشاف مستقبل ممكن|اختيار اتجاه بوعي|خطوة مرحلية صغيرة|اختبار احتمال مستقبلي|رؤية تعكس قيمك|توضيح الخطوة التالية|تنظيم موارد الهدف|مساهمة تريد تركها',
  },
  it: {
    fisico: 'Consapevolezza corporea|Movimento all’aperto|Movimento confortevole|Uno spazio di riposo tranquillo|Abitudini di idratazione|Attenzione nel movimento|Una routine di movimento|Tempo protetto per riposare|Movimento piacevole|Una routine di benessere realistica',
    intelectual: 'Una domanda da esplorare|Mettere alla prova un’idea|Lettura senza distrazioni|Verifica di una fonte|Un altro punto di vista|Una routine di studio|Spiegare un’idea complessa|Notare qualcosa di nuovo|Un’argomentazione personale|Scegliere cosa studiare',
    emocional: 'Emozioni e interpretazioni|Ciò che puoi influenzare oggi|Una pausa di calma|Riconoscere un’emozione|Esprimere un sentimento|Un dialogo interiore gentile|Tempo per elaborare un sentimento|Ridurre un attrito quotidiano|Ascoltare prima di rispondere|Una pratica di riflessione',
    arquetipico: 'Un valore da vivere|Coerenza tra parole e azioni|Una scelta quotidiana consapevole|Un impegno personale|Mostrarti autenticamente|Rispettare il tuo percorso|Rivedere una convinzione ereditata|Un nuovo modo di essere|Un’abitudine fedele ai tuoi valori|Esprimere valori attraverso la cura',
    espiritual: 'Il senso di questa giornata|Un momento di quiete|Presenza nel quotidiano|Connessione con la natura|La cura come pratica significativa|Un atto di servizio|Spazio per l’incertezza|Ascoltare le tue convinzioni|Spazio per la contemplazione|Ascoltare senza fretta',
    romantico: 'La cura nella relazione|Una conversazione sincera|Ascoltare il partner|Esprimere gratitudine|Un momento affettuoso insieme|Tempo protetto insieme|Rispettare i ritmi reciproci|Chiarire un’aspettativa condivisa|Un impegno che dipende da te|Essere un compagno di sostegno',
    familiar: 'Presenza in famiglia|Un gesto di cura familiare|Ascoltare una storia di famiglia|Un semplice momento familiare|Un dialogo familiare rispettoso|Tempo per un parente caro|Un rituale familiare costante|Un confine personale sano|Offrire aiuto pratico|Una priorità familiare',
    social: 'Essere presente per un amico|Esprimere gratitudine taciuta|Una conversazione attenta|Un legame autentico|Un gesto di benvenuto|Tempo per la rete di sostegno|Uno spazio condiviso accogliente|Un rituale di amicizia|Un’attività comunitaria|Un contributo possibile',
    financiero: 'Piccole spese ricorrenti|Il tempo dietro un acquisto|Un registro spese semplice|Una scelta di spesa controllabile|Una spesa imprevista|Una revisione regolare del denaro|Un risparmio sostenibile|Una priorità per le risorse|Un acquisto consapevole|Il tempo per gestire il denaro',
    profesional: 'Un lavoro significativo|Tempo di lavoro concentrato|Gestire il carico di lavoro|Una competenza professionale|Progressi costanti in un compito|Ascoltare riscontri utili|Prove del tuo contributo|Un flusso di lavoro migliore|Tempo per il lavoro prioritario|Un progetto motivante',
    ludico: 'Una pausa all’aperto|Giocare al tuo ritmo|Un’attività piacevole|Un’idea creativa giocosa|Svago senza schermi|Un momento sensoriale|Proteggere il riposo|Un momento spensierato condiviso|Giocare con qualcuno|Svago rigenerante',
    visionario: 'Una priorità futura|Un obiettivo a lungo termine|Un futuro possibile|Una direzione consapevole|Un piccolo traguardo|Testare una possibilità futura|Una visione fedele ai valori|Chiarire il prossimo passo|Risorse per un obiettivo|Un contributo da lasciare',
  },
  pt: {
    fisico: 'Consciência corporal|Movimento ao ar livre|Movimento confortável|Um espaço de descanso tranquilo|Hábitos de hidratação|Atenção ao se mover|Uma rotina de movimento|Tempo protegido para descansar|Movimento prazeroso|Uma rotina de bem-estar realista',
    intelectual: 'Uma pergunta a explorar|Testar uma ideia|Leitura sem distrações|Verificar uma fonte|Aprender outra perspectiva|Uma rotina de aprendizado|Explicar uma ideia complexa|Observar algo desconhecido|Criar seu próprio argumento|Escolher o que estudar',
    emocional: 'Separar emoções e interpretações|O que pode influenciar hoje|Uma pausa de calma|Reconhecer uma emoção|Expressar um sentimento|Um diálogo interno gentil|Tempo para processar emoções|Reduzir um atrito cotidiano|Escutar antes de responder|Uma prática de reflexão',
    arquetipico: 'Um valor para viver|Coerência entre palavras e ações|Uma escolha consciente|Um compromisso pessoal|Expressar sua autenticidade|Respeitar seu caminho|Rever uma crença herdada|Uma nova forma de ser|Um hábito que reflete seus valores|Expressar valores pelo cuidado',
    espiritual: 'O sentido deste dia|Um momento de quietude|Presença no cotidiano|Conexão com a natureza|Cuidado como prática significativa|Um ato de serviço|Espaço para a incerteza|Escutar suas convicções|Espaço para contemplar|Escutar sem pressa',
    romantico: 'Cuidado na relação|Uma conversa honesta|Escutar seu par|Expressar gratidão|Um momento afetuoso juntos|Tempo protegido juntos|Respeitar os ritmos de cada um|Uma expectativa compartilhada|Um compromisso ao seu alcance|Ser uma companhia que apoia',
    familiar: 'Presença com a família|Um gesto de cuidado familiar|Escutar uma história familiar|Um momento familiar simples|Uma conversa familiar respeitosa|Tempo para um familiar querido|Um ritual familiar constante|Um limite pessoal saudável|Oferecer apoio prático|Uma prioridade familiar',
    social: 'Estar presente para um amigo|Expressar gratidão não dita|Uma conversa atenta|Uma conexão autêntica|Um gesto de boas-vindas|Tempo para a rede de apoio|Um espaço compartilhado acolhedor|Um ritual de amizade|Uma atividade comunitária|Uma contribuição possível',
    financiero: 'Pequenos gastos recorrentes|O tempo por trás de uma compra|Simplificar o registro de gastos|Uma escolha de gasto controlável|Planejar um gasto imprevisto|Uma revisão periódica do dinheiro|Um hábito de poupança acessível|Uma prioridade de recursos|Uma compra consciente|O tempo de gestão financeira',
    profesional: 'Trabalho com sentido|Tempo de trabalho focado|Gerenciar sua carga de trabalho|Uma habilidade profissional|Progresso constante numa tarefa|Escutar feedback útil|Evidência da sua contribuição|Testar um fluxo de trabalho melhor|Tempo para trabalho prioritário|Um projeto que motiva',
    ludico: 'Uma pausa ao ar livre|Brincar no seu ritmo|Uma atividade prazerosa|Uma ideia criativa lúdica|Lazer sem telas|Um momento sensorial|Proteger o descanso|Compartilhar um momento alegre|Brincar com alguém|Lazer que renova',
    visionario: 'Uma prioridade para o futuro|Uma meta clara de longo prazo|Um futuro possível|Escolher um rumo consciente|Um pequeno marco|Testar uma possibilidade futura|Uma visão que reflete valores|Esclarecer o próximo passo|Recursos para uma meta|Uma contribuição para deixar',
  },
  ru: {
    fisico: 'Осознанность тела|Движение на воздухе|Комфортное движение|Спокойное место отдыха|Привычки пить воду|Внимание в движении|Регулярное движение|Защищённое время отдыха|Приятные формы движения|Реалистичная забота о себе',
    intelectual: 'Вопрос для исследования|Проверка идеи|Чтение без отвлечений|Проверка источника|Другой взгляд|Регулярное обучение|Простое объяснение сложного|Наблюдение незнакомого|Собственный аргумент|Выбор предмета изучения',
    emocional: 'Чувства и интерпретации|Ваше влияние сегодня|Спокойная пауза|Распознавание эмоции|Честное выражение чувства|Добрый внутренний диалог|Время прожить чувство|Меньше ежедневного трения|Слушать перед ответом|Рефлексивная практика',
    arquetipico: 'Ценность для жизни|Единство слов и действий|Осознанный ежедневный выбор|Личное обязательство|Подлинное самовыражение|Уважение своего пути|Пересмотр унаследованной установки|Новый способ быть собой|Привычка в согласии с ценностями|Ценности через заботу',
    espiritual: 'Смысл этого дня|Момент тишины|Присутствие в повседневности|Связь с природой|Забота как осмысленная практика|Помощь другим|Место неопределённости|Внимание к убеждениям|Пространство созерцания|Слушание без спешки',
    romantico: 'Забота в близких отношениях|Честный разговор|Слушать партнёра|Выражение благодарности|Тёплый момент вместе|Защищённое время вдвоём|Уважение ритма друг друга|Общее ожидание|Посильное обязательство|Поддержка партнёра',
    familiar: 'Присутствие в семье|Жест семейной заботы|Семейная история|Простой семейный момент|Уважительный семейный разговор|Время для близкого родственника|Стабильный семейный ритуал|Здоровая личная граница|Практическая поддержка|Семейный приоритет',
    social: 'Быть рядом с другом|Невысказанная благодарность|Внимательный разговор|Искренняя связь|Приветливый жест|Время для круга поддержки|Гостеприимное общее пространство|Ритуал дружбы|Общественная деятельность|Посильный вклад',
    financiero: 'Мелкие регулярные расходы|Время за покупкой|Простой учёт расходов|Управляемое решение о расходах|Неожиданные траты|Регулярный обзор финансов|Посильная привычка сберегать|Приоритет ресурсов|Осознанная покупка|Время управления деньгами',
    profesional: 'Осмысленная работа|Сосредоточенная работа|Управление нагрузкой|Профессиональный навык|Регулярное продвижение задачи|Полезная обратная связь|Свидетельство вашего вклада|Улучшение рабочего процесса|Время для важной работы|Вдохновляющий проект',
    ludico: 'Перерыв на воздухе|Игра в своём темпе|Приятное занятие|Игровая творческая идея|Досуг без экрана|Приятный чувственный момент|Время для отдыха|Общий весёлый момент|Игра с кем-то|Восстанавливающий досуг',
    visionario: 'Приоритет для будущего|Ясная долгосрочная цель|Возможное будущее|Осознанное направление|Небольшая веха|Проверка будущей возможности|Видение в согласии с ценностями|Ясный следующий шаг|Ресурсы для цели|Вклад в наследие',
  },
  de: {
    fisico: 'Körperbewusstsein|Bewegung im Freien|Angenehme Bewegung|Ein ruhiger Ruheplatz|Trinkgewohnheiten|Aufmerksamkeit bei Bewegung|Eine Bewegungsroutine|Geschützte Ruhezeit|Bewegung mit Freude|Eine realistische Wohlfühlroutine',
    intelectual: 'Eine lohnende Frage|Eine Idee prüfen|Ungestörtes Lesen|Eine Quelle prüfen|Eine andere Perspektive|Eine Lernroutine|Eine komplexe Idee einfach erklären|Unbekanntes beobachten|Ein eigenes Argument|Ein Lernthema wählen',
    emocional: 'Gefühle und Deutungen trennen|Dein Einfluss heute|Eine ruhige Pause|Ein Gefühl erkennen|Ein Gefühl ehrlich ausdrücken|Freundlicher innerer Dialog|Zeit für ein Gefühl|Alltägliche Reibung verringern|Vor dem Antworten zuhören|Eine Reflexionspraxis',
    arquetipico: 'Ein gelebter Wert|Worte und Taten im Einklang|Eine bewusste Alltagsentscheidung|Eine persönliche Zusage|Authentisch auftreten|Den eigenen Weg achten|Eine übernommene Überzeugung prüfen|Eine neue Art zu sein|Eine Gewohnheit nach deinen Werten|Werte durch Fürsorge zeigen',
    espiritual: 'Der Sinn dieses Tages|Ein stiller Moment|Präsenz im Alltag|Verbindung zur Natur|Fürsorge als sinnvolle Praxis|Ein Dienst für andere|Raum für Ungewissheit|Auf Überzeugungen hören|Raum für Betrachtung|Zuhören ohne Eile',
    romantico: 'Fürsorge in der Beziehung|Ein ehrliches Gespräch|Dem Partner zuhören|Wertschätzung ausdrücken|Ein warmer Moment zusammen|Geschützte Zeit zu zweit|Den Rhythmus beider achten|Eine gemeinsame Erwartung klären|Eine Zusage in deinem Einfluss|Ein unterstützender Partner sein',
    familiar: 'Präsenz in der Familie|Eine familiäre Geste|Eine Familiengeschichte hören|Ein einfacher Familienmoment|Ein respektvolles Familiengespräch|Zeit für einen Angehörigen|Ein verlässliches Familienritual|Eine gesunde persönliche Grenze|Praktische Hilfe|Eine Familienpriorität',
    social: 'Für einen Freund da sein|Unausgesprochenen Dank äußern|Ein aufmerksames Gespräch|Eine echte Verbindung|Eine einladende Geste|Zeit für dein Unterstützungsnetz|Ein einladender gemeinsamer Ort|Ein Freundschaftsritual|Eine Gemeinschaftsaktivität|Ein möglicher Beitrag',
    financiero: 'Kleine regelmäßige Ausgaben|Die Zeit hinter einem Kauf|Ein einfaches Ausgabenprotokoll|Eine beeinflussbare Ausgabe|Eine unerwartete Ausgabe planen|Ein regelmäßiger Finanzüberblick|Eine tragbare Spargewohnheit|Eine Ressourcenpriorität|Ein bewusster Kauf|Zeit für Geldverwaltung',
    profesional: 'Sinnvolle Arbeit|Konzentrierte Arbeitszeit|Die Arbeitslast steuern|Eine berufliche Fähigkeit|Stetiger Aufgabenfortschritt|Nützliches Feedback hören|Belege für deinen Beitrag|Einen besseren Ablauf testen|Zeit für wichtige Arbeit|Ein motivierendes Projekt',
    ludico: 'Eine Pause im Freien|Spielen im eigenen Tempo|Eine erfreuliche Aktivität|Eine spielerische kreative Idee|Bildschirmfreie Freizeit|Ein sinnlicher Moment|Ruhezeit schützen|Einen heiteren Moment teilen|Mit jemandem spielen|Erholsame Freizeit',
    visionario: 'Eine Zukunftspriorität|Ein klares langfristiges Ziel|Eine mögliche Zukunft|Bewusst eine Richtung wählen|Ein kleiner Meilenstein|Eine Zukunftsmöglichkeit testen|Eine Vision nach deinen Werten|Den nächsten Schritt klären|Ressourcen für ein Ziel|Ein bleibender Beitrag',
  },
  fr: {
    fisico: 'La conscience corporelle|Le mouvement en plein air|Le mouvement confortable|Un espace de repos calme|Les habitudes d’hydratation|L’attention en mouvement|Une routine de mouvement|Un temps de repos protégé|Des mouvements agréables|Une routine de bien-être réaliste',
    intelectual: 'Une question à explorer|Tester une idée|Lire sans distractions|Vérifier une source|Un autre point de vue|Une routine d’apprentissage|Expliquer simplement une idée complexe|Observer l’inconnu|Un argument personnel|Choisir quoi étudier',
    emocional: 'Distinguer émotions et interprétations|Votre influence aujourd’hui|Une pause apaisante|Reconnaître une émotion|Exprimer un sentiment honnêtement|Un dialogue intérieur bienveillant|Du temps pour une émotion|Réduire une friction quotidienne|Écouter avant de répondre|Une pratique de réflexion',
    arquetipico: 'Une valeur à vivre|La cohérence des paroles et des actes|Un choix quotidien conscient|Un engagement personnel|L’authenticité|Le respect de votre chemin|Revoir une croyance héritée|Une nouvelle façon d’être|Une habitude fidèle aux valeurs|Exprimer ses valeurs par le soin',
    espiritual: 'Le sens de cette journée|Un moment de calme|La présence au quotidien|Le lien avec la nature|Le soin comme pratique porteuse de sens|Un acte de service|Une place pour l’incertitude|L’écoute de ses convictions|Un espace de contemplation|L’écoute sans précipitation',
    romantico: 'Le soin dans la relation|Une conversation honnête|L’écoute du partenaire|Exprimer sa reconnaissance|Un moment chaleureux ensemble|Un temps protégé à deux|Le respect des rythmes de chacun|Clarifier une attente commune|Un engagement à votre portée|Être un partenaire de soutien',
    familiar: 'La présence en famille|Un geste de soin familial|Une histoire de famille|Un moment familial simple|Une conversation familiale respectueuse|Du temps pour un proche|Un rituel familial régulier|Une limite personnelle saine|Un soutien pratique|Une priorité familiale',
    social: 'Être présent pour un ami|Exprimer une gratitude tue|Une conversation attentive|Un lien authentique|Un geste d’accueil|Du temps pour son réseau de soutien|Un espace partagé accueillant|Un rituel d’amitié|Une activité communautaire|Une contribution possible',
    financiero: 'Les petites dépenses récurrentes|Le temps derrière un achat|Un suivi simple des dépenses|Un choix de dépense maîtrisable|Prévoir une dépense imprévue|Un bilan financier régulier|Une épargne accessible|Une priorité de ressources|Un achat réfléchi|Le temps de gestion de l’argent',
    profesional: 'Un travail porteur de sens|Du temps de travail concentré|La gestion de sa charge de travail|Une compétence professionnelle|Une progression régulière|L’écoute de retours utiles|Des preuves de votre contribution|Un meilleur processus de travail|Du temps pour le travail prioritaire|Un projet motivant',
    ludico: 'Une pause en plein air|Jouer à son rythme|Une activité agréable|Une idée créative ludique|Des loisirs sans écran|Un moment sensoriel|Protéger le repos|Partager un moment léger|Jouer avec quelqu’un|Des loisirs ressourçants',
    visionario: 'Une priorité pour l’avenir|Un objectif clair à long terme|Un avenir possible|Choisir consciemment une direction|Un petit jalon|Tester une possibilité future|Une vision fidèle aux valeurs|Clarifier la prochaine étape|Des ressources pour un objectif|Une contribution à laisser',
  },
  da: {
    fisico: 'Kropsbevidsthed|Bevægelse udendørs|Behagelig bevægelse|Et roligt hvilested|Drikkevaner|Opmærksomhed i bevægelse|En bevægelsesrutine|Beskyttet hviletid|Bevægelse med glæde|En realistisk trivselsrutine',
    intelectual: 'Et spørgsmål at udforske|Afprøve en idé|Læsning uden forstyrrelser|Kontrollere en kilde|Et andet perspektiv|En læringsrutine|Forklare en kompleks idé enkelt|Bemærke noget ukendt|Et eget argument|Vælge et studieemne',
    emocional: 'Følelser og fortolkninger|Din indflydelse i dag|En rolig pause|Bemærke en følelse|Udtrykke en følelse ærligt|En venligere indre dialog|Tid til at bearbejde en følelse|Mindre daglig friktion|Lytte før du svarer|En refleksionspraksis',
    arquetipico: 'En værdi at leve efter|Sammenhæng mellem ord og handling|Et bevidst hverdagsvalg|En personlig forpligtelse|At være autentisk|Respekt for din egen vej|Genoverveje en nedarvet tro|En ny måde at være på|En vane efter dine værdier|Værdier udtrykt gennem omsorg',
    espiritual: 'Dagens mening|Et stille øjeblik|Nærvær i hverdagen|Forbindelse til naturen|Omsorg som meningsfuld praksis|En tjeneste for andre|Plads til usikkerhed|Lytte til dine overbevisninger|Plads til fordybelse|Lytte uden hast',
    romantico: 'Omsorg i forholdet|En ærlig samtale|Lytte til din partner|Udtrykke taknemmelighed|Et varmt øjeblik sammen|Beskyttet tid sammen|Respekt for hinandens tempo|Afklare en fælles forventning|En forpligtelse du kan styre|At være en støttende partner',
    familiar: 'Nærvær med familien|En familiær omsorgsgerning|Lytte til en familiehistorie|Et enkelt familieøjeblik|En respektfuld familiesamtale|Tid til en nær slægtning|Et fast familieritual|En sund personlig grænse|Praktisk støtte|En familieprioritet',
    social: 'At være der for en ven|Udtrykke uudtalt tak|En opmærksom samtale|En ægte forbindelse|En velkomstgestus|Tid til dit støttenetværk|Et indbydende fælles rum|Et fast venskabsritual|En fællesskabsaktivitet|Et muligt bidrag',
    financiero: 'Små tilbagevendende udgifter|Tiden bag et køb|En enkel udgiftsoversigt|Et kontrollerbart forbrugsvalg|Planlægge en uventet udgift|Et regelmæssigt pengeeftersyn|En overkommelig opsparingsvane|En ressourceprioritet|Et bevidst køb|Tid til pengestyring',
    profesional: 'Meningsfuldt arbejde|Fokuseret arbejdstid|Styre din arbejdsbyrde|En faglig færdighed|Stadig fremgang i en opgave|Lytte til nyttig feedback|Bevis på dit bidrag|Afprøve en bedre arbejdsgang|Tid til prioriteret arbejde|Et motiverende projekt',
    ludico: 'En pause udendørs|Leg i dit eget tempo|En behagelig aktivitet|En legende kreativ idé|Skærmfri fritid|Et sanseligt øjeblik|Beskytte hviletiden|Dele et muntert øjeblik|Lege med nogen|Genopladende fritid',
    visionario: 'En fremtidsprioritet|Et klart langsigtet mål|En mulig fremtid|Et bevidst retningsvalg|En lille milepæl|Afprøve en fremtidig mulighed|En vision efter dine værdier|Afklare næste skridt|Ressourcer til et mål|Et bidrag at efterlade',
  },
};

export type BankActivity = { title: string; description: string; quote: BankQuote; level: number };
export function getBankActivities(mode: string, level: number, language: BankLanguage): BankActivity[] {
  const pairs = bankPairings[mode];
  if (!pairs || !Number.isInteger(level) || level < 0 || level > 9) return [];
  return pairs.map(([id, en, es], index) => {
    const title = language === 'es' ? es : language === 'en' ? en : topicTranslations[language]![mode].split('|')[index];
    const topic = ['es', 'en', 'it', 'pt', 'fr', 'da'].includes(language) ? title[0].toLocaleLowerCase(language) + title.slice(1) : title;
    return { title, description: levelSteps[language][level].replace('{topic}', topic), quote: bankQuotes.find(q => q.id === id)!, level };
  });
}
