import type { AppLanguage } from './languagePreference';
import { planAccessCopy } from './planAccessCopy';

export const planKeys = ['basic', 'gold', 'ultimate'] as const;
export type PlanKey = typeof planKeys[number];
type EntryFeatures = readonly [string, string, string, string, string, string, string, string, string, string, string, string];
type GoldFeatures = readonly [string, string, string, string, string, string, string, string, string, string];
type UltimateFeatures = readonly [string, string, string, string, string, string, string, string, string, string, string, string, string];
type PlanCatalogCopy = { basic: readonly [promise: string, features: EntryFeatures]; gold: readonly [promise: string, features: GoldFeatures]; ultimate: readonly [promise: string, features: UltimateFeatures] };
const planOptions = {
  basic: { name: 'Entry', monthlyMxn: 179 },
  gold: { name: 'Gold', monthlyMxn: 349 },
  ultimate: { name: 'ULTIMATE MODE', monthlyMxn: 1199 },
} satisfies Record<PlanKey, { name: string; monthlyMxn: number }>;

const es = {
  basic: ['Convierte a Modo Cultiva en parte de tu rutina.', ['Todo lo incluido en Acceso Libre.', 'Skin Holista.', 'Journeys ilimitados.', 'Pool completo con 10 recomendaciones por nivel.', 'Vision boards en nivel 9.', 'Configuraciones de Vida ilimitadas.', 'Modo IA limitado: hasta 20 consultas mensuales.', 'Personalización de nombre y foto de perfil.', 'Historial personal de evolución.', 'Estadísticas básicas por modo.', 'Exportación de progreso.', 'Insignia Entry.']],
  gold: ['Cultiva acompañado por tu red de apoyo.', ['Todo lo incluido en Entry.', 'Una skin adicional de tu elección.', 'Insights locales dentro de tu red de apoyo.', 'Solicitudes y respuestas de Insights con mayor frecuencia.', 'Grupos privados o círculos de confianza.', 'Comparación de progreso con tu círculo.', 'Modo IA ampliado: hasta 100 consultas mensuales.', 'Configuraciones de Vida compartibles.', 'Recomendaciones comunitarias.', 'Insignia Gold.']],
  ultimate: ['Lleva tu cultivo a una red global de conocimiento.', ['Todo lo incluido en Gold.', 'Temas y filtros ilimitados.', 'Ideas ilimitadas.', 'Ideas globales.', 'Modo IA sin límite fijo, sujeto a uso justo.', 'Red de Especialistas.', 'Directorio de profesionales por modo.', 'Filtros por especialidad, nivel, idioma y ubicación.', 'Perfiles profesionales verificados.', 'Solicitud de orientación privada.', 'Seguimiento de recomendaciones profesionales.', 'Insignia ULTIMATE MODE.', 'Acceso anticipado a nuevos temas y funciones.']],
} satisfies PlanCatalogCopy;

const en = {
  basic: ['Make Modo Cultiva part of your routine.', ['Everything in Free Access.', 'Holistic theme.', 'Unlimited Journeys.', 'Full activity library with 10 recommendations per level.', 'Vision boards at level 9.', 'Unlimited Life Configurations.', 'AI Mode: up to 20 requests per month.', 'Customize your profile name and photo.', 'Your personal progress history.', 'Basic statistics for each mode.', 'Export your progress.', 'Entry badge.']],
  gold: ['Grow with your support network.', ['Everything in Entry.', 'One additional theme of your choice.', 'Local insights within your support network.', 'More frequent insight requests and replies.', 'Private groups or trusted circles.', 'Compare progress with your circle.', 'Expanded AI Mode: up to 100 requests per month.', 'Shareable Life Configurations.', 'Community recommendations.', 'Gold badge.']],
  ultimate: ['Connect your growth to a global network of knowledge.', ['Everything in Gold.', 'Unlimited themes and filters.', 'Unlimited insights.', 'Global insights.', 'AI Mode with no fixed cap, subject to fair use.', 'Specialist Network.', 'Professional directory by mode.', 'Filters for specialty, level, language, and location.', 'Verified professional profiles.', 'Request private guidance.', 'Track professional recommendations.', 'ULTIMATE MODE badge.', 'Early access to new themes and features.']],
} satisfies PlanCatalogCopy;

const zh = {
  basic: ['让 Modo Cultiva 成为日常习惯。', ['包含免费访问的所有权益。', '整体风格主题。', '不限次数的成长旅程。', '完整活动库，每级提供 10 条建议。', '第 9 级愿景板。', '不限数量的生活配置。', 'AI 模式每月最多咨询 20 次。', '自定义档案姓名和头像。', '个人成长记录。', '各模式的基础统计。', '导出成长进度。', 'Entry 徽章。']],
  gold: ['与支持你的人一起成长。', ['包含 Entry 的所有权益。', '另选一个主题。', '支持网络内的本地建议。', '更频繁地请求和回复建议。', '私人小组或信任圈。', '与圈内成员比较进度。', 'AI 模式每月最多咨询 100 次。', '可分享的生活配置。', '社区推荐。', 'Gold 徽章。']],
  ultimate: ['让成长连接全球知识网络。', ['包含 Gold 的所有权益。', '主题与筛选条件不限。', '建议不限量。', '全球建议。', 'AI 模式无固定上限，须遵守合理使用规则。', '专家网络。', '按模式浏览专业人士目录。', '按专长、等级、语言和地区筛选。', '经过验证的专业人士档案。', '申请一对一指导。', '跟进专业建议。', 'ULTIMATE MODE 徽章。', '抢先体验新主题和功能。']],
} satisfies PlanCatalogCopy;

const hi = {
  basic: ['Modo Cultiva को अपनी दिनचर्या का हिस्सा बनाएँ।', ['मुफ़्त ऐक्सेस में शामिल सभी सुविधाएँ।', 'Holista थीम।', 'विकास की यात्राओं पर कोई सीमा नहीं।', 'गतिविधियों का पूरा संग्रह, हर स्तर पर 10 सुझाव।', 'स्तर 9 पर विज़न बोर्ड।', 'जितने चाहें उतने जीवन विन्यास।', 'AI मोड में हर महीने अधिकतम 20 सवाल।', 'प्रोफ़ाइल का नाम और फ़ोटो बदलें।', 'अपने विकास का निजी इतिहास।', 'हर मोड के बुनियादी आँकड़े।', 'अपनी प्रगति निर्यात करें।', 'Entry बैज।']],
  gold: ['अपने सहयोगी नेटवर्क के साथ आगे बढ़ें।', ['Entry की सभी सुविधाएँ।', 'अपनी पसंद की एक और थीम।', 'अपने नेटवर्क से स्थानीय सुझाव।', 'सुझाव ज़्यादा बार माँगें और दें।', 'निजी समूह या भरोसेमंद लोगों के दायरे।', 'अपने समूह के साथ प्रगति की तुलना।', 'AI मोड में हर महीने अधिकतम 100 सवाल।', 'जीवन विन्यास साझा करें।', 'समुदाय के सुझाव।', 'Gold बैज।']],
  ultimate: ['अपने विकास को दुनिया भर के ज्ञान से जोड़ें।', ['Gold की सभी सुविधाएँ।', 'थीम और फ़िल्टर पर कोई सीमा नहीं।', 'जितने चाहें उतने सुझाव।', 'दुनिया भर से सुझाव।', 'AI मोड की तय सीमा नहीं; उचित उपयोग के नियम लागू हैं।', 'विशेषज्ञ नेटवर्क।', 'हर मोड के विशेषज्ञों की सूची।', 'विशेषज्ञता, स्तर, भाषा और स्थान के फ़िल्टर।', 'सत्यापित विशेषज्ञ प्रोफ़ाइल।', 'निजी मार्गदर्शन का अनुरोध।', 'विशेषज्ञ के सुझावों की प्रगति देखें।', 'ULTIMATE MODE बैज।', 'नई थीम और सुविधाओं का शुरुआती ऐक्सेस।']],
} satisfies PlanCatalogCopy;

const ar = {
  basic: ['اجعل Modo Cultiva جزءاً من روتينك.', ['كل ما يشمله الوصول المجاني.', 'مظهر Holista.', 'مسارات نمو بلا حدّ.', 'مكتبة الأنشطة الكاملة مع 10 توصيات لكل مستوى.', 'لوحات الرؤية في المستوى 9.', 'تكوينات حياة بلا حدّ.', 'وضع الذكاء الاصطناعي: حتى 20 استشارة شهرياً.', 'تخصيص اسم ملفك وصورته.', 'سجلّ تقدّمك الشخصي.', 'إحصاءات أساسية لكل وضع.', 'تصدير تقدّمك.', 'شارة Entry.']],
  gold: ['انمُ مع شبكة دعمك.', ['كل ما يتضمّنه Entry.', 'مظهر إضافي تختاره.', 'أفكار محلية داخل شبكة دعمك.', 'طلب الأفكار والرد عليها بوتيرة أعلى.', 'مجموعات خاصة أو دوائر ثقة.', 'مقارنة تقدّمك بتقدّم دائرتك.', 'وضع الذكاء الاصطناعي الموسّع: حتى 100 استشارة شهرياً.', 'تكوينات حياة قابلة للمشاركة.', 'توصيات المجتمع.', 'شارة Gold.']],
  ultimate: ['اربط نموّك بشبكة عالمية للمعرفة.', ['كل ما يتضمّنه Gold.', 'مظاهر وعوامل تصفية بلا حدّ.', 'أفكار بلا حدّ.', 'أفكار عالمية.', 'وضع الذكاء الاصطناعي دون سقف ثابت، وفقاً للاستخدام العادل.', 'شبكة المتخصصين.', 'دليل للمتخصصين بحسب الوضع.', 'تصفية بحسب الاختصاص والمستوى واللغة والموقع.', 'ملفات مهنية موثّقة.', 'طلب توجيه خاص.', 'متابعة توصيات المتخصصين.', 'شارة ULTIMATE MODE.', 'وصول مبكر إلى مظاهر وميزات جديدة.']],
} satisfies PlanCatalogCopy;

const it = {
  basic: ['Fai entrare Modo Cultiva nella tua routine.', ['Tutto ciò che è incluso nell’accesso gratuito.', 'Tema Holista.', 'Percorsi illimitati.', 'Libreria completa, con 10 raccomandazioni per livello.', 'Bacheche della visione al livello 9.', 'Configurazioni di vita illimitate.', 'Modalità IA: fino a 20 consultazioni al mese.', 'Personalizza il nome e la foto del profilo.', 'Cronologia dei tuoi progressi.', 'Statistiche di base per ogni modalità.', 'Esporta i tuoi progressi.', 'Distintivo Entry.']],
  gold: ['Cresci con la tua rete di sostegno.', ['Tutto ciò che è incluso in Entry.', 'Un tema aggiuntivo a scelta.', 'Idee locali nella tua rete di sostegno.', 'Richiedi idee e rispondi con maggiore frequenza.', 'Gruppi privati o cerchie di fiducia.', 'Confronta i progressi con la tua cerchia.', 'Modalità IA estesa: fino a 100 consultazioni al mese.', 'Configurazioni di vita condivisibili.', 'Raccomandazioni della comunità.', 'Distintivo Gold.']],
  ultimate: ['Collega la tua crescita a una rete globale di conoscenze.', ['Tutto ciò che è incluso in Gold.', 'Temi e filtri illimitati.', 'Idee illimitate.', 'Idee globali.', 'Modalità IA senza tetto fisso, nel rispetto dell’uso corretto.', 'Rete di specialisti.', 'Elenco dei professionisti per modalità.', 'Filtri per specialità, livello, lingua e località.', 'Profili professionali verificati.', 'Richiedi consulenza privata.', 'Segui le raccomandazioni degli specialisti.', 'Distintivo ULTIMATE MODE.', 'Accesso anticipato a temi e funzioni nuove.']],
} satisfies PlanCatalogCopy;

const pt = {
  basic: ['Faça do Modo Cultiva parte da sua rotina.', ['Tudo o que está incluído no acesso gratuito.', 'Tema Holista.', 'Jornadas ilimitadas.', 'Biblioteca completa com 10 recomendações por nível.', 'Painéis de visão no nível 9.', 'Configurações de Vida ilimitadas.', 'Modo IA: até 20 consultas por mês.', 'Personalize o nome e a foto do seu perfil.', 'Histórico pessoal de progresso.', 'Estatísticas básicas por modo.', 'Exporte seu progresso.', 'Insígnia Entry.']],
  gold: ['Cresça com sua rede de apoio.', ['Tudo o que está incluído no Entry.', 'Um tema adicional à sua escolha.', 'Ideias locais na sua rede de apoio.', 'Solicite e responda a ideias com mais frequência.', 'Grupos privados ou círculos de confiança.', 'Compare seu progresso com o do seu círculo.', 'Modo IA ampliado: até 100 consultas por mês.', 'Configurações de Vida que podem ser compartilhadas.', 'Recomendações da comunidade.', 'Insígnia Gold.']],
  ultimate: ['Conecte seu crescimento a uma rede global de conhecimento.', ['Tudo o que está incluído no Gold.', 'Temas e filtros ilimitados.', 'Ideias ilimitadas.', 'Ideias globais.', 'Modo IA sem limite fixo, sujeito a uso justo.', 'Rede de Especialistas.', 'Diretório de profissionais por modo.', 'Filtros por especialidade, nível, idioma e local.', 'Perfis profissionais verificados.', 'Solicite orientação privada.', 'Acompanhe as recomendações profissionais.', 'Insígnia ULTIMATE MODE.', 'Acesso antecipado a novos temas e recursos.']],
} satisfies PlanCatalogCopy;

const ru = {
  basic: ['Сделайте Modo Cultiva частью своего распорядка.', ['Всё, что входит в бесплатный доступ.', 'Тема Holista.', 'Неограниченное число маршрутов развития.', 'Полная библиотека — 10 рекомендаций на каждом уровне.', 'Доски видения на уровне 9.', 'Неограниченное число конфигураций жизни.', 'Режим ИИ: до 20 запросов в месяц.', 'Настройка имени и фото профиля.', 'Личная история развития.', 'Базовая статистика по каждому режиму.', 'Экспорт прогресса.', 'Значок Entry.']],
  gold: ['Развивайтесь вместе с людьми, которые вас поддерживают.', ['Всё, что входит в Entry.', 'Дополнительная тема на выбор.', 'Местные идеи в сети поддержки.', 'Чаще запрашивайте идеи и отвечайте на них.', 'Закрытые группы или круги доверия.', 'Сравнивайте прогресс с участниками своего круга.', 'Расширенный режим ИИ: до 100 запросов в месяц.', 'Возможность делиться конфигурациями жизни.', 'Рекомендации сообщества.', 'Значок Gold.']],
  ultimate: ['Подключите своё развитие к мировой сети знаний.', ['Всё, что входит в Gold.', 'Неограниченное число тем и фильтров.', 'Неограниченное число идей.', 'Идеи со всего мира.', 'Режим ИИ без фиксированного лимита при соблюдении правил добросовестного использования.', 'Сеть специалистов.', 'Каталог профессионалов по режимам.', 'Фильтры по специализации, уровню, языку и местоположению.', 'Проверенные профили специалистов.', 'Запрос личной консультации.', 'Отслеживание рекомендаций специалистов.', 'Значок ULTIMATE MODE.', 'Ранний доступ к новым темам и функциям.']],
} satisfies PlanCatalogCopy;

const de = {
  basic: ['Mach Modo Cultiva zu einem Teil deines Alltags.', ['Alle Vorteile des kostenlosen Zugangs.', 'Design Holista.', 'Beliebig viele Entwicklungswege.', 'Vollständige Aktivitätsbibliothek mit 10 Empfehlungen pro Stufe.', 'Visionstafeln auf Stufe 9.', 'Beliebig viele Lebenskonfigurationen.', 'KI-Modus: bis zu 20 Anfragen pro Monat.', 'Profilname und -foto anpassen.', 'Dein persönlicher Entwicklungsverlauf.', 'Basisstatistiken für jeden Modus.', 'Deinen Fortschritt exportieren.', 'Entry-Abzeichen.']],
  gold: ['Wachse mit deinem Unterstützungsnetzwerk.', ['Alle Vorteile von Entry.', 'Ein zusätzliches Design deiner Wahl.', 'Lokale Ideen aus deinem Unterstützungsnetzwerk.', 'Häufiger Ideen anfragen und beantworten.', 'Private Gruppen oder Vertrauenskreise.', 'Vergleiche deinen Fortschritt mit dem deines Kreises.', 'Erweiterter KI-Modus: bis zu 100 Anfragen pro Monat.', 'Lebenskonfigurationen teilen.', 'Empfehlungen aus der Gemeinschaft.', 'Gold-Abzeichen.']],
  ultimate: ['Verbinde deine Entwicklung mit einem weltweiten Wissensnetzwerk.', ['Alle Vorteile von Gold.', 'Beliebig viele Designs und Filter.', 'Beliebig viele Ideen.', 'Globale Ideen.', 'KI-Modus ohne feste Obergrenze, nach den Regeln zur fairen Nutzung.', 'Netzwerk von Fachpersonen.', 'Fachpersonen nach Modus im Verzeichnis finden.', 'Filter nach Fachgebiet, Stufe, Sprache und Standort.', 'Verifizierte Profile von Fachpersonen.', 'Persönliche Beratung anfragen.', 'Empfehlungen von Fachpersonen weiterverfolgen.', 'ULTIMATE MODE-Abzeichen.', 'Frühzeitiger Zugang zu neuen Designs und Funktionen.']],
} satisfies PlanCatalogCopy;

const fr = {
  basic: ['Intégrez Modo Cultiva à votre quotidien.', ['Tout ce qui est compris dans l’accès gratuit.', 'Thème Holista.', 'Parcours illimités.', 'Bibliothèque complète avec 10 recommandations par niveau.', 'Tableaux de vision au niveau 9.', 'Configurations de vie illimitées.', 'Mode IA : jusqu’à 20 demandes par mois.', 'Personnalisation du nom et de la photo de profil.', 'Historique personnel de vos progrès.', 'Statistiques de base par mode.', 'Export de vos progrès.', 'Badge Entry.']],
  gold: ['Évoluez avec votre réseau de soutien.', ['Tout ce qui est compris dans Entry.', 'Un thème supplémentaire au choix.', 'Idées locales au sein de votre réseau de soutien.', 'Demandes et réponses plus fréquentes autour des idées.', 'Groupes privés ou cercles de confiance.', 'Comparaison des progrès avec votre cercle.', 'Mode IA étendu : jusqu’à 100 demandes par mois.', 'Configurations de vie partageables.', 'Recommandations de la communauté.', 'Badge Gold.']],
  ultimate: ['Reliez votre développement à un réseau mondial de connaissances.', ['Tout ce qui est compris dans Gold.', 'Thèmes et filtres illimités.', 'Idées illimitées.', 'Idées mondiales.', 'Mode IA sans plafond fixe, dans le respect de la politique d’utilisation raisonnable.', 'Réseau de spécialistes.', 'Annuaire de spécialistes par mode.', 'Filtres par spécialité, niveau, langue et lieu.', 'Profils professionnels vérifiés.', 'Demande d’accompagnement privé.', 'Suivi des recommandations des spécialistes.', 'Badge ULTIMATE MODE.', 'Accès anticipé aux nouveaux thèmes et fonctionnalités.']],
} satisfies PlanCatalogCopy;

const da = {
  basic: ['Gør Modo Cultiva til en del af din hverdag.', ['Alt, hvad gratis adgang omfatter.', 'Holista-tema.', 'Ubegrænsede udviklingsforløb.', 'Komplet aktivitetsbibliotek med 10 anbefalinger pr. niveau.', 'Visionstavler på niveau 9.', 'Ubegrænsede livskonfigurationer.', 'AI-tilstand: op til 20 forespørgsler om måneden.', 'Tilpas navn og profilbillede.', 'Din personlige udviklingshistorik.', 'Grundlæggende statistik for hver tilstand.', 'Eksportér dine fremskridt.', 'Entry-mærke.']],
  gold: ['Udvikl dig sammen med dit støttenetværk.', ['Alt, hvad Entry omfatter.', 'Et ekstra tema efter eget valg.', 'Lokale idéer i dit støttenetværk.', 'Bed om idéer og svar oftere.', 'Private grupper eller fortrolige kredse.', 'Sammenlign fremskridt med din kreds.', 'Udvidet AI-tilstand: op til 100 forespørgsler om måneden.', 'Livskonfigurationer, der kan deles.', 'Anbefalinger fra fællesskabet.', 'Gold-mærke.']],
  ultimate: ['Forbind din udvikling med et globalt netværk af viden.', ['Alt, hvad Gold omfatter.', 'Ubegrænsede temaer og filtre.', 'Ubegrænsede idéer.', 'Globale idéer.', 'AI-tilstand uden fast loft, underlagt regler om rimelig brug.', 'Specialistnetværk.', 'Oversigt over fagpersoner for hver tilstand.', 'Filtre efter speciale, niveau, sprog og sted.', 'Verificerede fagprofiler.', 'Bed om privat vejledning.', 'Følg op på faglige anbefalinger.', 'ULTIMATE MODE-mærke.', 'Tidlig adgang til nye temaer og funktioner.']],
} satisfies PlanCatalogCopy;

const plansByLocale = { es, en, zh, hi, ar, it, pt, ru, de, fr, da } satisfies Record<AppLanguage, PlanCatalogCopy>;

export function formatPlanPrice(language: AppLanguage, plan: PlanKey): string {
  const cost = new Intl.NumberFormat(language, {
    style: 'currency', currency: 'MXN', currencyDisplay: 'code', maximumFractionDigits: 0,
  }).format(planOptions[plan].monthlyMxn);
  return `${cost} · ${planAccessCopy(language).monthTaxIncluded}`;
}

export const planName = (plan: PlanKey) => planOptions[plan].name;

export function planDetailsForLocale(language: AppLanguage, plan: PlanKey) {
  const [promise, features] = plansByLocale[language][plan];
  return { name: planName(plan), price: formatPlanPrice(language, plan), promise, features };
}
