import type { AppLanguage } from './languagePreference';
import { BADGE_MODES } from './badgeProgress';

// The profiles in this directory are fictional examples, not
// listings of real providers. Keys are stable so localization cannot change
// which profile a person is viewing.
export const specialistProfileIds = [
  'sofia', 'marcus', 'elena', 'wei', 'ananya', 'layla', 'luca', 'natalia', 'hannah', 'camille', 'mikkel',
] as const;

export type SpecialistProfileId = typeof specialistProfileIds[number];
type ProfileCopy = readonly [specialty: string, background: string, message: string, configuration: string];
type DirectoryCopy = Record<SpecialistProfileId, ProfileCopy>;

export const specialistProfilesEn = {
  sofia: ['Strategy and leadership', 'Twelve years supporting fast-growing teams and helping leaders develop a more deliberate approach.', 'Your career can reflect your values as much as your ability to deliver results.', 'Purposeful leadership'],
  marcus: ['Wealth and financial decisions', 'An economist and wealth adviser who has designed financial systems for founders and families.', 'Money becomes strategic when it stops being a source of noise and starts serving your vision.', 'Growing wealth'],
  elena: ['Relationships and emotional regulation', 'A psychotherapist and relationship facilitator who works with emotional regulation, boundaries, and difficult conversations.', 'Emotional presence grows in small moments: a pause, a question, and a willingness to listen.', 'Intentional relationships'],
  wei: ['Learning and critical thinking', 'A researcher who designs learning habits for creative teams.', 'Sustained curiosity turns every question into a doorway.', 'An expanding mind'],
  ananya: ['Purpose and contemplation', 'A facilitator of contemplative practices and rituals centered on purpose.', 'A small practice can give an entire day direction again.', 'Essential presence'],
  layla: ['Family and roots', 'A family mediator specializing in conversations across generations.', 'Tending to our roots can also make room to grow.', 'Living roots'],
  luca: ['Relationships and connection', 'A couples therapist and educator in intentional intimacy.', 'Connection is built through presence, honesty, and time together.', 'Being present together'],
  natalia: ['Identity and personal narrative', 'A mentor on identity and personal narrative during times of transition.', 'Naming the story you choose to live changes how you move through it.', 'Archetypes in motion'],
  hannah: ['Community and collaboration', 'A designer of communities and support networks for purpose-led projects.', 'A healthy network makes it easier to see clearly and act on what matters.', 'Intentional community'],
  camille: ['Health and energy', 'A specialist in physical habits, rest, and sustainable energy.', 'Your body is not another item on your to-do list. It is where you begin.', 'Sustainable energy'],
  mikkel: ['Play and creativity', 'A designer of playful experiences that help people rediscover curiosity and rest.', 'Play is not a break from growing. It is also a way to grow.', 'Active curiosity'],
} satisfies DirectoryCopy;

export const specialistProfilesFr = {
  sofia: ['Stratégie et leadership', 'Douze ans à accompagner des équipes en forte croissance et à développer un leadership plus conscient.', 'Votre carrière peut être un lieu de cohérence avec vos valeurs, et pas seulement de performance.', 'Diriger avec une raison d’être'],
  marcus: ['Patrimoine et décisions financières', 'Économiste et conseiller en patrimoine, il a conçu des systèmes financiers pour des familles et des personnes qui créent des entreprises.', 'L’argent devient stratégique lorsqu’il cesse de parasiter vos décisions et commence à servir votre vision.', 'Patrimoine en expansion'],
  elena: ['Relations et régulation émotionnelle', 'Psychothérapeute et facilitatrice, elle travaille sur la régulation émotionnelle, les limites et les conversations difficiles.', 'La présence émotionnelle se cultive dans les petits gestes : une pause, une question et la volonté d’écouter.', 'Liens conscients'],
  wei: ['Apprentissage et réflexion', 'Chercheur, il conçoit des habitudes d’apprentissage pour des équipes créatives.', 'Une curiosité entretenue ouvre une porte à chaque question.', 'Esprit en expansion'],
  ananya: ['Sens et contemplation', 'Elle anime des pratiques contemplatives et des rituels qui aident à retrouver du sens.', 'Une petite pratique peut redonner un cap à toute une journée.', 'Présence essentielle'],
  layla: ['Famille et racines', 'Médiatrice familiale spécialisée dans le dialogue entre générations.', 'Prendre soin de ses racines laisse aussi de la place pour grandir.', 'Racines vivantes'],
  luca: ['Relations et connexion', 'Thérapeute de couple et formateur en intimité consciente.', 'La connexion se construit par la présence, la sincérité et le temps partagé.', 'Présence à deux'],
  natalia: ['Identité et récit personnel', 'Elle accompagne les questions d’identité et de récit personnel lors des périodes de transition.', 'Nommer l’histoire que vous choisissez de vivre change votre façon de la traverser.', 'Archétypes en mouvement'],
  hannah: ['Communauté et collaboration', 'Elle conçoit des communautés et des réseaux de soutien pour des projets guidés par une raison d’être.', 'Un réseau sain renforce à la fois la clarté et la capacité d’agir.', 'Communauté intentionnelle'],
  camille: ['Santé et énergie', 'Spécialiste des habitudes corporelles, du repos et de l’énergie durable.', 'Votre corps n’est pas une tâche de plus : c’est votre point de départ.', 'Énergie durable'],
  mikkel: ['Jeu et créativité', 'Il conçoit des expériences ludiques pour retrouver la curiosité et le repos.', 'Le jeu n’est pas une pause dans le développement : c’est aussi une façon de grandir.', 'Curiosité active'],
} satisfies DirectoryCopy;

export const specialistProfilesPt = {
  sofia: ['Estratégia e liderança', 'Há doze anos acompanha equipes de alto crescimento e processos de liderança consciente.', 'Sua carreira também pode refletir seus valores, e não só seu desempenho.', 'Liderança com propósito'],
  marcus: ['Patrimônio e decisões financeiras', 'Economista e consultor patrimonial, já criou sistemas financeiros para fundadores de empresas e famílias.', 'O dinheiro se torna estratégico quando deixa de gerar ruído e começa a servir à sua visão.', 'Patrimônio em expansão'],
  elena: ['Vínculos e regulação emocional', 'Psicoterapeuta e facilitadora de vínculos, trabalha com regulação emocional, limites e conversas difíceis.', 'A presença emocional se cultiva nos pequenos gestos: uma pausa, uma pergunta e a disposição para ouvir.', 'Vínculos conscientes'],
  wei: ['Aprendizagem e pensamento', 'Pesquisador que desenvolve hábitos de aprendizagem para equipes criativas.', 'A curiosidade cultivada torna cada pergunta uma porta.', 'Mente em expansão'],
  ananya: ['Propósito e contemplação', 'Facilita práticas contemplativas e rituais voltados ao propósito.', 'Uma pequena prática pode devolver a direção a um dia inteiro.', 'Presença essencial'],
  layla: ['Família e raízes', 'Mediadora familiar especializada em conversas entre gerações.', 'Cuidar das raízes também pode abrir espaço para crescer.', 'Raízes vivas'],
  luca: ['Vínculos e conexão', 'Terapeuta de casais e educador em intimidade consciente.', 'A conexão se constrói com presença, honestidade e tempo compartilhado.', 'Presença a dois'],
  natalia: ['Identidade e narrativa pessoal', 'Mentora de identidade e narrativa pessoal em fases de transição.', 'Dar nome à história que você escolhe viver muda a forma de percorrê-la.', 'Arquétipos em movimento'],
  hannah: ['Comunidade e colaboração', 'Cria comunidades e redes de apoio para projetos com propósito.', 'Uma rede saudável aumenta tanto a clareza quanto a capacidade de agir.', 'Comunidade intencional'],
  camille: ['Saúde e energia', 'Especialista em hábitos corporais, descanso e energia sustentável.', 'Seu corpo não é mais uma tarefa pendente: é de onde você parte.', 'Energia sustentável'],
  mikkel: ['Brincadeira e criatividade', 'Cria experiências lúdicas para recuperar a curiosidade e o descanso.', 'Brincar não é uma pausa no desenvolvimento: também é uma forma de crescer.', 'Curiosidade ativa'],
} satisfies DirectoryCopy;

export const specialistProfilesDe = {
  sofia: ['Strategie und Führung', 'Sie begleitet seit zwölf Jahren schnell wachsende Teams und die Entwicklung bewusster Führung.', 'Dein Beruf kann Raum für gelebte Werte sein, nicht nur für Leistung.', 'Führung mit Sinn'],
  marcus: ['Vermögen und Finanzentscheidungen', 'Als Ökonom und Vermögensberater entwickelt er Finanzsysteme für Menschen, die Unternehmen gründen, und für Familien.', 'Geld wird zum strategischen Werkzeug, wenn es nicht mehr ablenkt, sondern deiner Vision dient.', 'Wachsendes Vermögen'],
  elena: ['Beziehungen und Emotionsregulation', 'Als Psychotherapeutin und Beziehungsbegleiterin arbeitet sie mit Emotionsregulation, Grenzen und schwierigen Gesprächen.', 'Emotionales Dasein wächst in kleinen Momenten: einer Pause, einer Frage und der Bereitschaft zuzuhören.', 'Bewusste Beziehungen'],
  wei: ['Lernen und Denken', 'Er erforscht und entwickelt Lerngewohnheiten für kreative Teams.', 'Neugier, die du weiter pflegst, macht jede Frage zu einer offenen Tür.', 'Wachsender Horizont'],
  ananya: ['Lebenssinn und Kontemplation', 'Sie begleitet kontemplative Übungen und Rituale, die auf Sinn ausgerichtet sind.', 'Eine kleine Übung kann einem ganzen Tag wieder Richtung geben.', 'Wesentliche Präsenz'],
  layla: ['Familie und Wurzeln', 'Sie ist Familienmediatorin und auf Gespräche zwischen Generationen spezialisiert.', 'Wer seine Wurzeln pflegt, kann damit auch Platz für Wachstum schaffen.', 'Lebendige Wurzeln'],
  luca: ['Beziehungen und Verbundenheit', 'Er ist Paartherapeut und vermittelt einen bewussten Umgang mit Nähe.', 'Verbundenheit entsteht aus Präsenz, Ehrlichkeit und gemeinsam verbrachter Zeit.', 'Näher durch Präsenz'],
  natalia: ['Identität und persönliche Geschichte', 'Sie begleitet Menschen im Wandel bei der Arbeit an Identität und eigener Geschichte.', 'Die Geschichte zu benennen, für die du dich entscheidest, verändert, wie du sie lebst.', 'Archetypen in Bewegung'],
  hannah: ['Gemeinschaft und Zusammenarbeit', 'Sie gestaltet Gemeinschaften und Unterstützungsnetzwerke für sinnorientierte Projekte.', 'Ein gesundes Netzwerk schärft den Blick und stärkt die Fähigkeit zu handeln.', 'Bewusste Gemeinschaft'],
  camille: ['Gesundheit und Energie', 'Sie ist auf körperbezogene Gewohnheiten, Erholung und nachhaltige Energie spezialisiert.', 'Dein Körper ist kein weiterer Punkt auf deiner Aufgabenliste. Er ist dein Ausgangspunkt.', 'Nachhaltige Energie'],
  mikkel: ['Spiel und Kreativität', 'Er gestaltet spielerische Erfahrungen, mit denen Menschen Neugier und Erholung wiederentdecken.', 'Spiel ist keine Pause vom Wachsen, sondern eine Möglichkeit zu wachsen.', 'Aktive Neugier'],
} satisfies DirectoryCopy;

export const specialistProfilesIt = {
  sofia: ['Strategia e leadership', 'Da dodici anni accompagna team in forte crescita e percorsi di leadership consapevole.', 'La tua carriera può riflettere i tuoi valori, non solo i tuoi risultati.', 'Leadership con uno scopo'],
  marcus: ['Patrimonio e decisioni finanziarie', 'Economista e consulente patrimoniale, ha progettato sistemi finanziari per chi fonda imprese e per le famiglie.', 'Il denaro diventa strategico quando smette di fare rumore e comincia a servire la tua visione.', 'Patrimonio in crescita'],
  elena: ['Relazioni e regolazione emotiva', 'Psicoterapeuta e facilitatrice nelle relazioni, si occupa di regolazione emotiva, confini e conversazioni difficili.', 'La presenza emotiva cresce nei piccoli gesti: una pausa, una domanda e la disponibilità ad ascoltare.', 'Legami consapevoli'],
  wei: ['Apprendimento e pensiero', 'Ricercatore che progetta abitudini di apprendimento per gruppi creativi.', 'La curiosità coltivata con costanza fa di ogni domanda una porta.', 'Mente in espansione'],
  ananya: ['Scopo e contemplazione', 'Facilita pratiche contemplative e rituali centrati sul senso di ciò che si fa.', 'Una piccola pratica può ridare direzione a un’intera giornata.', 'Presenza essenziale'],
  layla: ['Famiglia e radici', 'Mediatrice familiare specializzata nel dialogo tra generazioni.', 'Prendersi cura delle proprie radici può anche fare spazio per crescere.', 'Radici vive'],
  luca: ['Relazioni e connessione', 'Terapeuta di coppia e formatore nell’intimità consapevole.', 'La connessione si costruisce con presenza, onestà e tempo condiviso.', 'Presenza nella coppia'],
  natalia: ['Identità e racconto personale', 'Offre guida sull’identità e sul racconto di sé nei periodi di transizione.', 'Dare un nome alla storia che scegli di vivere cambia il modo in cui la attraversi.', 'Archetipi in movimento'],
  hannah: ['Comunità e collaborazione', 'Progetta comunità e reti di sostegno per iniziative guidate da uno scopo.', 'Una rete sana rafforza sia la chiarezza sia la capacità di agire.', 'Comunità intenzionale'],
  camille: ['Salute ed energia', 'Specialista di abitudini fisiche, riposo ed energia sostenibile.', 'Il tuo corpo non è un compito in sospeso: è il tuo punto di partenza.', 'Energia sostenibile'],
  mikkel: ['Gioco e creatività', 'Progetta esperienze di gioco per ritrovare curiosità e riposo.', 'Il gioco non è una pausa dalla crescita: è anche un modo di crescere.', 'Curiosità attiva'],
} satisfies DirectoryCopy;

export const specialistProfilesDa = {
  sofia: ['Strategi og ledelse', 'Hun har i tolv år støttet teams i hurtig vækst og hjulpet ledere med at arbejde mere bevidst.', 'Din karriere kan være et sted, hvor du lever dine værdier, ikke bare leverer resultater.', 'Ledelse med formål'],
  marcus: ['Formue og økonomiske beslutninger', 'Økonom og formuerådgiver, der har udviklet økonomiske systemer til iværksættere og familier.', 'Penge bliver strategiske, når de holder op med at støje og begynder at tjene din vision.', 'Formue i vækst'],
  elena: ['Relationer og følelsesregulering', 'Psykoterapeut og facilitator med fokus på følelsesregulering, grænser og svære samtaler.', 'Følelsesmæssigt nærvær dyrkes i det små: en pause, et spørgsmål og viljen til at lytte.', 'Bevidste relationer'],
  wei: ['Læring og tænkning', 'Forsker, der udvikler læringsvaner for kreative teams.', 'Vedvarende nysgerrighed gør hvert spørgsmål til en åben dør.', 'En horisont i vækst'],
  ananya: ['Formål og fordybelse', 'Hun vejleder i kontemplative øvelser og ritualer med fokus på mening.', 'En lille øvelse kan give en hel dag retning igen.', 'Nærvær i det væsentlige'],
  layla: ['Familie og rødder', 'Familiemægler med speciale i samtaler mellem generationer.', 'Omsorg for vores rødder kan også give plads til at vokse.', 'Levende rødder'],
  luca: ['Relationer og nærhed', 'Parterapeut og underviser i bevidst intimitet.', 'Nærhed bygges med nærvær, ærlighed og tid sammen.', 'Nærvær i parforholdet'],
  natalia: ['Identitet og personlig fortælling', 'Hun vejleder om identitet og den personlige fortælling i overgangsperioder.', 'At sætte ord på den historie, du vælger at leve, ændrer, hvordan du går gennem den.', 'Arketyper i bevægelse'],
  hannah: ['Fællesskab og samarbejde', 'Hun designer fællesskaber og støttenetværk til projekter, der drives af et formål.', 'Et sundt netværk øger både klarheden og evnen til at handle.', 'Bevidst fællesskab'],
  camille: ['Sundhed og energi', 'Specialist i kropslige vaner, hvile og holdbar energi.', 'Din krop er ikke endnu en opgave på listen. Den er dit udgangspunkt.', 'Holdbar energi'],
  mikkel: ['Leg og kreativitet', 'Han skaber legende oplevelser, der hjælper med at genfinde nysgerrighed og hvile.', 'Leg er ikke en pause fra udvikling. Det er også en måde at udvikle sig på.', 'Aktiv nysgerrighed'],
} satisfies DirectoryCopy;

export const specialistProfilesRu = {
  sofia: ['Стратегия и лидерство', 'Двенадцать лет помогает быстрорастущим командам и развивает осознанный подход к лидерству.', 'Карьера может быть способом жить в согласии с собой, а не только добиваться результатов.', 'Лидерство со смыслом'],
  marcus: ['Благосостояние и финансовые решения', 'Экономист и консультант по управлению капиталом, проектировал финансовые системы для основателей компаний и семей.', 'Деньги становятся стратегическим инструментом, когда перестают отвлекать и служат вашему видению.', 'Растущий капитал'],
  elena: ['Отношения и эмоциональная регуляция', 'Психотерапевт и специалист по отношениям, работает с эмоциями, границами и сложными разговорами.', 'Эмоциональное присутствие растёт из маленьких шагов: паузы, вопроса и готовности слушать.', 'Осознанные отношения'],
  wei: ['Обучение и мышление', 'Исследователь, который разрабатывает учебные привычки для творческих команд.', 'Если поддерживать любопытство, каждый вопрос превращается в открытую дверь.', 'Расширение кругозора'],
  ananya: ['Предназначение и созерцание', 'Ведёт созерцательные практики и ритуалы, направленные на поиск смысла.', 'Небольшая практика может вернуть направление целому дню.', 'Присутствие в главном'],
  layla: ['Семья и корни', 'Семейный медиатор, специализируется на диалоге между поколениями.', 'Забота о корнях тоже может дать пространство для роста.', 'Живые корни'],
  luca: ['Отношения и близость', 'Семейный психотерапевт и преподаватель практик осознанной близости.', 'Связь растёт из внимания, честности и времени, проведённого вместе.', 'Присутствие в паре'],
  natalia: ['Идентичность и личная история', 'Помогает разобраться в своей идентичности и личной истории в переходные периоды.', 'Назвать историю, которую вы выбираете, — значит изменить то, как вы её проживаете.', 'Архетипы в движении'],
  hannah: ['Сообщество и сотрудничество', 'Создаёт сообщества и сети поддержки для проектов со смыслом.', 'Здоровая сеть помогает яснее видеть и увереннее действовать.', 'Осознанное сообщество'],
  camille: ['Здоровье и энергия', 'Специалист по телесным привычкам, отдыху и устойчивой энергии.', 'Ваше тело — не ещё одна задача в списке. С него всё начинается.', 'Устойчивая энергия'],
  mikkel: ['Игра и творчество', 'Создаёт игровые форматы, помогающие вернуть любопытство и отдых.', 'Игра — не перерыв в развитии. Это один из способов расти.', 'Живое любопытство'],
} satisfies DirectoryCopy;

export const specialistProfilesZh = {
  sofia: ['策略与领导力', '十二年来一直支持快速成长的团队，并协助培养更有觉察的领导方式。', '职业发展不仅可以追求表现，也可以让行动与价值观一致。', '有目标的领导力'],
  marcus: ['财富管理与财务决策', '经济学家和财富顾问，曾为创业者与家庭设计财务体系。', '当金钱不再让人分心，而是服务于你的愿景时，它就成了策略工具。', '增长中的财富'],
  elena: ['人际关系与情绪调节', '心理治疗师和关系引导师，专注于情绪调节、个人界限与困难对话。', '对情绪的觉察来自小事：停顿一下、提出一个问题，以及愿意倾听。', '有觉察的关系'],
  wei: ['学习与思考', '研究人员，为创意团队设计学习习惯。', '让好奇心持续下去，每个问题都能成为一扇门。', '拓展思维'],
  ananya: ['人生目标与沉思', '带领观照练习与探索人生意义的仪式。', '一个小小的练习可以让一整天重新找到方向。', '回到当下'],
  layla: ['家庭与根源', '家庭调解员，专注于不同世代之间的对话。', '照料根基，也能为成长腾出空间。', '鲜活的根源'],
  luca: ['亲密关系与联结', '伴侣治疗师，教授如何有意识地培养亲密感。', '专注当下、坦诚相对并共度时光，才能建立联结。', '伴侣间的陪伴'],
  natalia: ['身份认同与个人叙事', '帮助处于人生转折阶段的人探索身份认同和自己的故事。', '为你选择的人生故事命名，会改变你走过这段旅程的方式。', '变化中的原型'],
  hannah: ['社群与协作', '为有明确使命的项目设计社群和支持网络。', '健康的支持网络让人看得更清楚，也更有能力行动。', '有意识的社群'],
  camille: ['健康与精力', '专注于身体习惯、休息与可持续精力管理。', '你的身体不是待办清单上的另一项任务，而是你的出发点。', '可持续的精力'],
  mikkel: ['游戏与创造力', '设计游戏体验，帮助人们重新找回好奇心与休息。', '游戏不是成长的暂停键，也是一种成长方式。', '主动探索'],
} satisfies DirectoryCopy;

export const specialistProfilesAr = {
  sofia: ['الاستراتيجية والقيادة', 'ترافق منذ اثني عشر عاماً الفرق سريعة النمو وتساعد القادة على تطوير نهج أكثر وعياً.', 'يمكن لمسيرتك المهنية أن تعبّر عن قيمك، لا عن أدائك فحسب.', 'قيادة هادفة'],
  marcus: ['إدارة الثروة والقرارات المالية', 'خبير اقتصاد ومستشار في إدارة الثروة؛ صمّم أنظمة مالية للمؤسسين والعائلات.', 'يصير المال أداة استراتيجية حين يكفّ عن تشتيت انتباهك ويبدأ بخدمة رؤيتك.', 'ثروة تنمو'],
  elena: ['العلاقات وتنظيم المشاعر', 'معالجة نفسية وميسّرة للعلاقات، تعمل على تنظيم المشاعر والحدود والحوارات الصعبة.', 'ينمو الحضور العاطفي في التفاصيل الصغيرة: وقفة وسؤال واستعداد للإصغاء.', 'علاقات واعية'],
  wei: ['التعلّم والتفكير', 'باحث يصمّم عادات تعلّم تناسب الفرق الإبداعية.', 'حين يستمر الفضول، يصبح كل سؤال باباً مفتوحاً.', 'عقل يتّسع'],
  ananya: ['الغاية والتأمّل', 'تيسّر ممارسات تأمّلية وطقوساً تساعد على استكشاف الغاية.', 'قد تعيد ممارسة صغيرة الاتجاه إلى يوم كامل.', 'الحضور في الجوهر'],
  layla: ['العائلة والجذور', 'وسيطة عائلية متخصّصة في الحوار بين الأجيال.', 'يمكن للعناية بالجذور أن تفتح مجالاً للنمو أيضاً.', 'جذور حية'],
  luca: ['العلاقات والتواصل', 'معالج للأزواج ومعلّم في تنمية الحميمية بوعي.', 'يتكوّن التواصل بالحضور والصدق والوقت المشترك.', 'حضور في العلاقة'],
  natalia: ['الهوية والسرد الشخصي', 'ترافق الناس في استكشاف هويتهم وروايتهم الشخصية خلال مراحل التحوّل.', 'تسمية القصة التي تختار أن تعيشها تغيّر الطريقة التي تسلك بها مسارها.', 'أنماط أصلية في حركة'],
  hannah: ['المجتمع والتعاون', 'تصمّم مجتمعات وشبكات دعم للمشاريع التي تقودها غاية واضحة.', 'تزيد الشبكة السليمة وضوح الرؤية والقدرة على العمل معاً.', 'مجتمع واعٍ'],
  camille: ['الصحة والطاقة', 'متخصّصة في العادات الجسدية والراحة والطاقة المستدامة.', 'جسمك ليس مهمة أخرى في قائمة الانتظار؛ إنه نقطة انطلاقك.', 'طاقة مستدامة'],
  mikkel: ['اللعب والإبداع', 'يصمّم تجارب لعب تساعد على استعادة الفضول والراحة.', 'اللعب ليس استراحة من النمو، بل هو أحد سبل النمو.', 'فضول نشط'],
} satisfies DirectoryCopy;

export const specialistProfilesHi = {
  sofia: ['रणनीति और नेतृत्व', 'बारह वर्षों से तेज़ी से बढ़ती टीमों के साथ काम कर रही हैं और सजग नेतृत्व विकसित करने में मदद करती हैं।', 'आपका काम सिर्फ़ प्रदर्शन करने की जगह नहीं है; उसमें आपके मूल्य भी दिख सकते हैं।', 'उद्देश्यपूर्ण नेतृत्व'],
  marcus: ['संपत्ति और आर्थिक फ़ैसले', 'अर्थशास्त्री और संपत्ति सलाहकार, जिन्होंने उद्यम शुरू करने वालों और परिवारों के लिए वित्तीय व्यवस्थाएँ बनाई हैं।', 'पैसा तब काम का साधन बनता है जब वह ध्यान भटकाने के बजाय आपके लक्ष्य पूरे करने में मदद करे।', 'बढ़ती संपत्ति'],
  elena: ['रिश्ते और भावनाएँ सँभालना', 'मनोचिकित्सक और संबंधों में मदद करने वाली विशेषज्ञ, जो भावनाओं, सीमाओं और मुश्किल बातचीत पर काम करती हैं।', 'भावनात्मक रूप से मौजूद रहना छोटी बातों से आता है: एक ठहराव, एक सवाल और सुनने की इच्छा।', 'सजग रिश्ते'],
  wei: ['सीखना और विचार करना', 'रचनात्मक टीमों के लिए सीखने की आदतें बनाने वाले शोधकर्ता।', 'जिज्ञासा बनाए रखने पर हर सवाल एक नया दरवाज़ा बन सकता है।', 'विचारों का विस्तार'],
  ananya: ['उद्देश्य और चिंतन', 'चिंतन के अभ्यास और उद्देश्य खोजने वाले अनुष्ठानों में मार्गदर्शन देती हैं।', 'एक छोटा अभ्यास पूरे दिन को फिर से दिशा दे सकता है।', 'ज़रूरी बातों पर ध्यान'],
  layla: ['परिवार और जड़ें', 'अलग-अलग पीढ़ियों के बीच बातचीत में विशेषज्ञता रखने वाली पारिवारिक मध्यस्थ।', 'अपनी जड़ों की देखभाल करने से आगे बढ़ने की जगह भी बनती है।', 'जीवंत जड़ें'],
  luca: ['रिश्ते और जुड़ाव', 'दंपति परामर्शदाता जो सजग आत्मीयता के बारे में भी सिखाते हैं।', 'जुड़ाव ध्यान, ईमानदारी और साथ बिताए समय से बनता है।', 'रिश्ते में मौजूदगी'],
  natalia: ['पहचान और अपनी कहानी', 'बदलाव के दौर में लोगों को उनकी पहचान और अपनी कहानी समझने में मदद करती हैं।', 'आप जिस कहानी को जीना चुनते हैं उसे नाम देने से उसे जीने का ढंग बदलता है।', 'बदलते आदिरूप'],
  hannah: ['समुदाय और सहयोग', 'उद्देश्यपूर्ण पहलों के लिए समुदाय और मदद के नेटवर्क बनाती हैं।', 'एक स्वस्थ नेटवर्क साफ़ सोचने और काम करने की क्षमता बढ़ाता है।', 'सोच-समझकर बना समुदाय'],
  camille: ['स्वास्थ्य और ऊर्जा', 'शारीरिक आदतों, आराम और लंबे समय तक ऊर्जा बनाए रखने में विशेषज्ञ।', 'आपका शरीर कामों की सूची में एक और काम नहीं है। यहीं से आप शुरुआत करते हैं।', 'टिकाऊ ऊर्जा'],
  mikkel: ['खेल और रचनात्मकता', 'ऐसे खेल अनुभव बनाते हैं जिनसे लोगों को जिज्ञासा और आराम फिर मिल सके।', 'खेलना विकास से छुट्टी लेना नहीं है। यह भी आगे बढ़ने का तरीका है।', 'सक्रिय जिज्ञासा'],
} satisfies DirectoryCopy;

const specialistProfilesEs = {
  sofia: ['Estrategia y liderazgo', '12 años acompañando equipos de alto crecimiento y procesos de liderazgo consciente.', 'Tu carrera también puede ser un lugar de coherencia, no solo de rendimiento.', 'Liderazgo con propósito'],
  marcus: ['Patrimonio y decisiones', 'Economista y asesor de patrimonio; ha diseñado sistemas financieros para fundadores y familias.', 'El dinero se vuelve estratégico cuando deja de ser una fuente de ruido y empieza a servir a tu visión.', 'Patrimonio en expansión'],
  elena: ['Vínculos y regulación', 'Psicoterapeuta y facilitadora de vínculos; trabaja con regulación, límites y conversaciones difíciles.', 'La presencia emocional se cultiva en lo pequeño: una pausa, una pregunta y la voluntad de escuchar.', 'Vínculos conscientes'],
  wei: ['Aprendizaje y pensamiento', 'Investigador y diseñador de hábitos de aprendizaje para equipos creativos.', 'La curiosidad sostenida convierte cada pregunta en una puerta.', 'Mente en expansión'],
  ananya: ['Propósito y contemplación', 'Facilitadora de prácticas contemplativas y rituales de propósito.', 'Una práctica pequeña puede devolverle dirección a un día entero.', 'Presencia esencial'],
  layla: ['Familia y raíces', 'Mediadora familiar especializada en conversaciones entre generaciones.', 'Cuidar las raíces también puede abrir espacio para crecer.', 'Raíces vivas'],
  luca: ['Vínculos y conexión', 'Terapeuta de pareja y educador en intimidad consciente.', 'La conexión se diseña con presencia, honestidad y tiempo compartido.', 'Vínculo presente'],
  natalia: ['Identidad y narrativa', 'Mentora de identidad y narrativa personal para etapas de transición.', 'Nombrar la historia que eliges vivir cambia la forma de caminarla.', 'Arquetipos en movimiento'],
  hannah: ['Comunidad y colaboración', 'Diseñadora de comunidades y redes de apoyo para proyectos con propósito.', 'Una red sana multiplica la claridad y también la capacidad de actuar.', 'Comunidad intencional'],
  camille: ['Salud y energía', 'Especialista en hábitos corporales, descanso y energía sostenible.', 'Tu cuerpo no es una tarea pendiente: es el lugar desde donde empiezas.', 'Energía sostenible'],
  mikkel: ['Juego y creatividad', 'Diseñador de experiencias de juego para recuperar curiosidad y descanso.', 'El juego no es una pausa del desarrollo; también es una forma de desarrollarte.', 'Curiosidad activa'],
} satisfies DirectoryCopy;

const profilesByLocale = {
  es: specialistProfilesEs, en: specialistProfilesEn, fr: specialistProfilesFr,
  pt: specialistProfilesPt, de: specialistProfilesDe, it: specialistProfilesIt,
  da: specialistProfilesDa, ru: specialistProfilesRu, zh: specialistProfilesZh,
  ar: specialistProfilesAr, hi: specialistProfilesHi,
} satisfies Record<AppLanguage, DirectoryCopy>;

export function specialistProfileCopy(language: AppLanguage, id: SpecialistProfileId) {
  const [specialty, trajectory, message, presetName] = profilesByLocale[language][id];
  return { specialty, trajectory, message, presetName };
}

type ExampleLabels = readonly [string, string, string, string, string, string, string, string, string, string, string, string];
const exampleSpecialties = {
  es: ['Hábitos, descanso y energía', 'Aprendizaje y pensamiento', 'Regulación y bienestar', 'Identidad y narrativa', 'Propósito y contemplación', 'Vínculos y conexión', 'Familia y raíces', 'Comunidad y colaboración', 'Patrimonio y decisiones', 'Estrategia y liderazgo', 'Creatividad y disfrute', 'Visión y planificación'],
  en: ['Habits, rest, and energy', 'Learning and thinking', 'Regulation and well-being', 'Identity and narrative', 'Purpose and contemplation', 'Relationships and connection', 'Family and roots', 'Community and collaboration', 'Wealth and decisions', 'Strategy and leadership', 'Creativity and enjoyment', 'Vision and planning'],
  zh: ['习惯、休息与精力', '学习与思考', '情绪调节与身心健康', '身份认同与叙事', '人生目标与沉思', '亲密关系与联结', '家庭与根源', '社群与协作', '财富与决策', '策略与领导力', '创造力与乐趣', '愿景与规划'],
  hi: ['आदतें, आराम और ऊर्जा', 'सीखना और विचार करना', 'भावनाओं का संतुलन और सेहत', 'पहचान और अपनी कहानी', 'उद्देश्य और चिंतन', 'रिश्ते और जुड़ाव', 'परिवार और जड़ें', 'समुदाय और सहयोग', 'संपत्ति और फ़ैसले', 'रणनीति और नेतृत्व', 'रचनात्मकता और आनंद', 'कल्पना और योजना'],
  ar: ['العادات والراحة والطاقة', 'التعلّم والتفكير', 'تنظيم المشاعر والعافية', 'الهوية والسرد', 'الغاية والتأمّل', 'العلاقات والتواصل', 'العائلة والجذور', 'المجتمع والتعاون', 'الثروة والقرارات', 'الاستراتيجية والقيادة', 'الإبداع والمتعة', 'الرؤية والتخطيط'],
  it: ['Abitudini, riposo ed energia', 'Apprendimento e pensiero', 'Regolazione emotiva e benessere', 'Identità e racconto', 'Scopo e contemplazione', 'Relazioni e connessione', 'Famiglia e radici', 'Comunità e collaborazione', 'Patrimonio e decisioni', 'Strategia e leadership', 'Creatività e piacere', 'Visione e pianificazione'],
  pt: ['Hábitos, descanso e energia', 'Aprendizagem e pensamento', 'Regulação e bem-estar', 'Identidade e narrativa', 'Propósito e contemplação', 'Vínculos e conexão', 'Família e raízes', 'Comunidade e colaboração', 'Patrimônio e decisões', 'Estratégia e liderança', 'Criatividade e prazer', 'Visão e planejamento'],
  ru: ['Привычки, отдых и энергия', 'Обучение и мышление', 'Регуляция и благополучие', 'Идентичность и личная история', 'Предназначение и созерцание', 'Отношения и близость', 'Семья и корни', 'Сообщество и сотрудничество', 'Капитал и финансовые решения', 'Стратегия и лидерство', 'Творчество и радость', 'Видение и планирование'],
  de: ['Gewohnheiten, Erholung und Energie', 'Lernen und Denken', 'Emotionsregulation und Wohlbefinden', 'Identität und persönliche Geschichte', 'Lebenssinn und Kontemplation', 'Beziehungen und Verbundenheit', 'Familie und Wurzeln', 'Gemeinschaft und Zusammenarbeit', 'Vermögen und Entscheidungen', 'Strategie und Führung', 'Kreativität und Freude', 'Zukunftsbild und Planung'],
  fr: ['Habitudes, repos et énergie', 'Apprentissage et réflexion', 'Régulation émotionnelle et bien-être', 'Identité et récit personnel', 'Sens et contemplation', 'Relations et connexion', 'Famille et racines', 'Communauté et collaboration', 'Patrimoine et décisions', 'Stratégie et leadership', 'Créativité et plaisir', 'Vision et planification'],
  da: ['Vaner, hvile og energi', 'Læring og tænkning', 'Følelsesregulering og trivsel', 'Identitet og fortælling', 'Formål og fordybelse', 'Relationer og nærhed', 'Familie og rødder', 'Fællesskab og samarbejde', 'Formue og beslutninger', 'Strategi og ledelse', 'Kreativitet og glæde', 'Vision og planlægning'],
} satisfies Record<AppLanguage, ExampleLabels>;
const exampleProfile = {
  es: (specialty, mode) => [`Perfil de demostración en «${specialty}», centrado en prácticas medibles y acompañamiento cercano.`, 'Cada avance empieza con una práctica que puedas sostener y revisar.', `${mode} en equilibrio`],
  en: (specialty, mode) => [`Example profile in “${specialty}”, focused on measurable practices and close support.`, 'Progress starts with a practice you can sustain and review.', `${mode} in balance`],
  zh: (specialty, mode) => [`这是“${specialty}”领域的演示资料，侧重于可衡量的实践和持续支持。`, '每一步进展都始于一种你能坚持并回顾的实践。', `${mode}：保持平衡`],
  hi: (specialty, mode) => [`“${specialty}” का उदाहरण प्रोफ़ाइल, जिसमें मापे जा सकने वाले अभ्यास और निरंतर सहयोग पर ज़ोर है।`, 'प्रगति उस अभ्यास से शुरू होती है जिसे आप निभा सकें और जिसकी समीक्षा कर सकें।', `${mode} में संतुलन`],
  ar: (specialty, mode) => [`ملف تعريفي توضيحي في «${specialty}»، يركّز على ممارسات قابلة للقياس ومرافقة عن قرب.`, 'يبدأ التقدّم بممارسة يمكنك المواظبة عليها ومراجعتها.', `${mode} في توازن`],
  it: (specialty, mode) => [`Profilo dimostrativo nell’ambito «${specialty}», con un’attenzione a pratiche misurabili e a un supporto continuo.`, 'Ogni passo avanti inizia con una pratica da sostenere e rivedere nel tempo.', `${mode} in equilibrio`],
  pt: (specialty, mode) => [`Perfil de demonstração em «${specialty}», com foco em práticas mensuráveis e acompanhamento próximo.`, 'Todo avanço começa com uma prática que você consegue manter e revisar.', `${mode} em equilíbrio`],
  ru: (specialty, mode) => [`Демонстрационный профиль в сфере «${specialty}» с упором на измеримые практики и регулярную поддержку.`, 'Прогресс начинается с практики, которую можно поддерживать и пересматривать.', `${mode} в равновесии`],
  de: (specialty, mode) => [`Beispielprofil im Bereich „${specialty}“ mit Fokus auf messbare Übungen und enge Begleitung.`, 'Fortschritt beginnt mit einer Übung, die du beibehalten und überprüfen kannst.', `${mode} im Gleichgewicht`],
  fr: (specialty, mode) => [`Profil de démonstration en « ${specialty} », axé sur des pratiques mesurables et un accompagnement régulier.`, 'Tout progrès commence par une pratique que vous pouvez maintenir et revoir.', `${mode} en équilibre`],
  da: (specialty, mode) => [`Eksempelprofil inden for »${specialty}« med fokus på målbar praksis og tæt støtte.`, 'Fremskridt begynder med en øvelse, du kan fastholde og gennemgå.', `${mode} i balance`],
} satisfies Record<AppLanguage, (specialty: string, mode: string) => readonly [string, string, string]>;

export function specialistExampleCopy(language: AppLanguage, mode: typeof BADGE_MODES[number], localizedModeName: string) {
  const specialty = exampleSpecialties[language][BADGE_MODES.indexOf(mode)];
  const [trajectory, message, presetName] = exampleProfile[language](specialty, localizedModeName);
  return { specialty, trajectory, message, presetName };
}
