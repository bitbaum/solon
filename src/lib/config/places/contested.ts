/**
 * Contested places, compared question by question (design:
 * docs/design/2026-11-contested-law.md). Who governs a place and who claims it
 * is stated once, in `src/lib/config/world.ts` (`claimedBy`); this file adds,
 * for a claimed place, what each side's own text says on the same questions.
 *
 * Nothing here is Solon's summary of the law. A provision is the words of the
 * text, in their language, with a translation, and the page they were read on;
 * `pnpm run statistics:verify` re-reads every page and fails when its words are
 * gone. A question nobody has read for a side is a gap with what would fill it,
 * never a blank. The topics are the same for every place, so every comparison
 * has one shape.
 */
import { defineContests, defineContestTopics } from "@/lib/places/contested";

/** The questions every contested place is asked, in this order. */
export const CONTEST_TOPICS = defineContestTopics([
  {
    key: "territory",
    label: {
      en: "The territory",
      de: "Das Gebiet",
      fr: "Le territoire",
      it: "Il territorio",
      ru: "Территория",
    },
    question: {
      en: "What territory does the text say the state consists of, and can it be changed?",
      de: "Aus welchem Gebiet besteht der Staat nach dem Text, und kann es geändert werden?",
      fr: "De quel territoire le texte dit-il que l'État se compose, et peut-il être modifié ?",
      it: "Di quale territorio il testo dice che lo Stato è composto, e può essere modificato?",
      ru: "Из какой территории, согласно тексту, состоит государство и может ли она быть изменена?",
    },
  },
  {
    key: "citizenship",
    label: {
      en: "Citizenship",
      de: "Staatsbürgerschaft",
      fr: "Citoyenneté",
      it: "Cittadinanza",
      ru: "Гражданство",
    },
    question: {
      en: "May a citizen hold another citizenship, and can citizenship be taken away?",
      de: "Darf eine Bürgerin oder ein Bürger eine weitere Staatsbürgerschaft haben, und kann die Staatsbürgerschaft entzogen werden?",
      fr: "Un citoyen peut-il avoir une autre citoyenneté, et peut-on lui retirer la sienne ?",
      it: "Un cittadino può avere un'altra cittadinanza, e la cittadinanza può essere tolta?",
      ru: "Может ли гражданин иметь другое гражданство и может ли он быть лишён гражданства?",
    },
  },
  {
    key: "movement",
    label: {
      en: "Moving and leaving",
      de: "Bewegen und Ausreisen",
      fr: "Circuler et partir",
      it: "Circolare e partire",
      ru: "Передвижение и выезд",
    },
    question: {
      en: "May a person move freely, leave the country and come back?",
      de: "Darf man sich frei bewegen, das Land verlassen und zurückkehren?",
      fr: "Peut-on circuler librement, quitter le pays et y revenir ?",
      it: "Si può circolare liberamente, lasciare il paese e tornare?",
      ru: "Можно ли свободно передвигаться, выезжать из страны и возвращаться?",
    },
  },
  {
    key: "defence",
    label: {
      en: "Defence and service",
      de: "Verteidigung und Dienst",
      fr: "Défense et service",
      it: "Difesa e servizio",
      ru: "Защита и служба",
    },
    question: {
      en: "Does the text make defence a duty, and who decides how service is done?",
      de: "Macht der Text die Verteidigung zur Pflicht, und wer bestimmt, wie Dienst geleistet wird?",
      fr: "Le texte fait-il de la défense un devoir, et qui décide comment le service est accompli ?",
      it: "Il testo fa della difesa un dovere, e chi decide come si presta servizio?",
      ru: "Делает ли текст защиту обязанностью и кто определяет порядок прохождения службы?",
    },
  },
]);

const READ = "2026-11-10";

const SO_CONSTITUTION = {
  publisher:
    "Парламент Республики Южная Осетия: Конституция Республики Южная Осетия (Parliament of the Republic of South Ossetia: the Constitution), as read",
  url: "https://parliamentrso.org/node/3567",
  read: READ,
  expect: [
    "Республика Южная Осетия состоит из пяти административно-территориальных единиц",
    "Территория Республики Южная Осетия неприкосновенна и неотчуждаема",
    "Территория, статус и границы Республики Южная Осетия не могут быть изменены",
    "Республика Южная Осетия имеет свое гражданство",
    "не может быть лишен гражданства или права на его изменение",
    "В Республике Южная Осетия допускается двойное гражданство",
    "Каждый имеет право выезжать за пределы Республики Южная Осетия",
    "право беспрепятственного возвращения в Республику Южная Осетия",
    "Защита Отечества - священный долг каждого гражданина Республики Южная Осетия",
    "обязан защищать интересы государства",
  ],
};

const GE_CONSTITUTION = {
  publisher:
    "Constitute Project: Georgia's Constitution of 1995 with Amendments through 2018, English translation, as read",
  url: "https://www.constituteproject.org/constitution/Georgia_2018",
  read: READ,
  expect: [
    "Article 1. State sovereignty",
    "including the Autonomous Soviet Socialist Republic of Abkhazia and the former Autonomous Region of South Ossetia",
    "The alienation of the territory of the state of Georgia shall be prohibited",
    "Article 7. Basis of territorial arrangement",
    "after the complete restoration of the jurisdiction of Georgia over the entire territory of the country",
    "Article 14. Freedom of movement",
    "and to leave Georgia freely",
    "A citizen of Georgia shall be able to enter Georgia freely",
    "Article 32. Citizenship of Georgia",
    "the conditions for holding citizenship of another state by a citizen of Georgia shall be determined by the organic law",
    "The deprivation of citizenship shall be inadmissible",
    "Article 70. Defence Forces",
    "The procedure for performing military service shall be determined by law",
  ],
};

/** The South Ossetian Constitution as Solon's register holds it: the Parliament's node 3567. */
const soAct = { authority: "rso", scheme: "publisher_ref", value: "parliamentrso:3567" };
const GE_TRANSLATOR = "Constitute Project (English translation; the authentic text is in Georgian)";

export const CONTESTS = defineContests(CONTEST_TOPICS, [
  {
    place: "south-ossetia",
    sides: [
      { key: "rso", role: "governs", lawAuthority: "rso" },
      { key: "georgia", role: "claims", lawAuthority: null },
    ],
    provisions: [
      {
        topic: "territory",
        side: "rso",
        label: "Constitution, Art. 3",
        act: soAct,
        provision: "art_3",
        quote: {
          text: "2. Республика Южная Осетия состоит из пяти административно-территориальных единиц: города Цхинвал, Дзауского, Знаурского, Ленингорского и Цхинвальского районов.\n3. Территория Республики Южная Осетия неприкосновенна и неотчуждаема. […]\n4. Территория, статус и границы Республики Южная Осетия не могут быть изменены без согласия ее народа.",
          lang: "ru",
          translation: {
            en: "2. The Republic of South Ossetia consists of five administrative-territorial units: the city of Tskhinval and the Dzau, Znaur, Leningor and Tskhinval districts.\n3. The territory of the Republic of South Ossetia is inviolable and inalienable. […]\n4. The territory, status and borders of the Republic of South Ossetia cannot be changed without the consent of its people.",
          },
          evidence: [SO_CONSTITUTION],
        },
      },
      {
        topic: "territory",
        side: "georgia",
        label: "Constitution, Art. 1",
        act: null,
        provision: null,
        translator: GE_TRANSLATOR,
        quote: {
          text: "Georgia is an independent, unified and indivisible state as confirmed by the Referendum of 31 March 1991 held in the entire territory of the country, including the Autonomous Soviet Socialist Republic of Abkhazia and the former Autonomous Region of South Ossetia, and by the Act of Restoration of State Independence of Georgia of 9 April 1991. […] The alienation of the territory of the state of Georgia shall be prohibited.",
          lang: "en",
          evidence: [GE_CONSTITUTION],
        },
      },
      {
        topic: "territory",
        side: "georgia",
        label: "Constitution, Art. 7",
        act: null,
        provision: null,
        translator: GE_TRANSLATOR,
        quote: {
          text: "The state territorial arrangement of Georgia shall be revised by a constitutional law of Georgia on the basis of the principle of the separation of powers after the complete restoration of the jurisdiction of Georgia over the entire territory of the country.",
          lang: "en",
          evidence: [GE_CONSTITUTION],
        },
      },
      {
        topic: "citizenship",
        side: "rso",
        label: "Constitution, Art. 16",
        act: soAct,
        provision: "art_16",
        quote: {
          text: "1. Республика Южная Осетия имеет свое гражданство.\n2. Гражданин Республики Южная Осетия не может быть лишен гражданства или права на его изменение. Основания и порядок приобретения гражданства определяются конституционным законом.\n3. В Республике Южная Осетия допускается двойное гражданство.",
          lang: "ru",
          translation: {
            en: "1. The Republic of South Ossetia has its own citizenship.\n2. A citizen of the Republic of South Ossetia cannot be deprived of citizenship or of the right to change it. The grounds and procedure for acquiring citizenship are set by a constitutional law.\n3. Dual citizenship is permitted in the Republic of South Ossetia.",
          },
          evidence: [SO_CONSTITUTION],
        },
      },
      {
        topic: "citizenship",
        side: "georgia",
        label: "Constitution, Art. 32",
        act: null,
        provision: null,
        translator: GE_TRANSLATOR,
        quote: {
          text: "Citizenship of Georgia shall be acquired by birth or naturalisation. The procedures for acquiring and losing the citizenship of Georgia, the conditions and procedures for granting citizenship of Georgia to a foreign citizen and the conditions for holding citizenship of another state by a citizen of Georgia shall be determined by the organic law.\nThe deprivation of citizenship shall be inadmissible.",
          lang: "en",
          evidence: [GE_CONSTITUTION],
        },
      },
      {
        topic: "movement",
        side: "rso",
        label: "Constitution, Art. 24",
        act: soAct,
        provision: "art_24",
        quote: {
          text: "1. Каждому, кто законно находится на территории Республики Южная Осетия, принадлежит право свободного передвижения по ее территории и свободного выбора места жительства, кроме случаев, оговоренных законом.\n2. Каждый имеет право выезжать за пределы Республики Южная Осетия.\n3. Граждане Республики Южная Осетия имеют право беспрепятственного возвращения в Республику Южная Осетия.",
          lang: "ru",
          translation: {
            en: "1. Everyone lawfully on the territory of the Republic of South Ossetia has the right to move freely within it and to choose freely where to live, except in cases provided by law.\n2. Everyone has the right to leave the Republic of South Ossetia.\n3. Citizens of the Republic of South Ossetia have the right to return to the Republic of South Ossetia without hindrance.",
          },
          evidence: [SO_CONSTITUTION],
        },
      },
      {
        topic: "movement",
        side: "georgia",
        label: "Constitution, Art. 14",
        act: null,
        provision: null,
        translator: GE_TRANSLATOR,
        quote: {
          text: "Everyone lawfully staying in Georgia shall have the right to move freely within the territory of the country, to choose a place of residence freely and to leave Georgia freely.\nThese rights may only be restricted in accordance with law, for ensuring national security or public safety, protecting health or administering justice, insofar as is necessary in a democratic society.\nA citizen of Georgia shall be able to enter Georgia freely.",
          lang: "en",
          evidence: [GE_CONSTITUTION],
        },
      },
      {
        topic: "defence",
        side: "rso",
        label: "Constitution, Art. 42",
        act: soAct,
        provision: "art_42",
        quote: {
          text: "1. Защита Отечества - священный долг каждого гражданина Республики Южная Осетия. […]\n2. Гражданин Республики Южная Осетия обязан защищать интересы государства, способствовать укреплению его обороноспособности.",
          lang: "ru",
          translation: {
            en: "1. Defending the Fatherland is the sacred duty of every citizen of the Republic of South Ossetia. […]\n2. A citizen of the Republic of South Ossetia is obliged to defend the interests of the state and to help strengthen its defence capability.",
          },
          evidence: [SO_CONSTITUTION],
        },
      },
      {
        topic: "defence",
        side: "georgia",
        label: "Constitution, Art. 70",
        act: null,
        provision: null,
        translator: GE_TRANSLATOR,
        quote: {
          text: "The defence of Georgia shall be every citizen's duty. The procedure for performing military service shall be determined by law.",
          lang: "en",
          evidence: [GE_CONSTITUTION],
        },
      },
    ],
    open: {
      en: "Both sides are quoted from their constitutions only. Each leaves the detail to statutes that were not read: citizenship (South Ossetia's constitutional law on citizenship; Georgia's organic law), and military service on both sides. Georgia's text is the Constitute Project's English translation: the authentic Georgian text is published on matsne.gov.ge, which refused Solon's reader on the day this was read. What each side's law says about acts, documents and property issued under the other's has not been read; it is the next question to add.",
      de: "Beide Seiten werden nur aus ihren Verfassungen zitiert. Beide überlassen die Einzelheiten Gesetzen, die nicht gelesen wurden: die Staatsbürgerschaft (Südossetiens Verfassungsgesetz über die Staatsbürgerschaft; Georgiens Organgesetz) und auf beiden Seiten den Militärdienst. Georgiens Text ist die englische Übersetzung des Constitute Project: der verbindliche georgische Text erscheint auf matsne.gov.ge, das Solons Leseprogramm am Tag der Lektüre abwies. Was das Recht jeder Seite über Akte, Dokumente und Eigentum sagt, die nach dem Recht der anderen entstanden sind, wurde nicht gelesen; es ist die nächste Frage.",
      fr: "Les deux côtés ne sont cités que d'après leur constitution. Chacune renvoie le détail à des lois qui n'ont pas été lues : la citoyenneté (la loi constitutionnelle sud-ossète sur la citoyenneté ; la loi organique géorgienne) et, des deux côtés, le service militaire. Le texte géorgien est la traduction anglaise du Constitute Project : le texte géorgien authentique est publié sur matsne.gov.ge, qui a refusé le lecteur de Solon le jour de la lecture. Ce que le droit de chaque côté dit des actes, documents et biens établis sous le droit de l'autre n'a pas été lu ; c'est la prochaine question.",
      it: "Entrambe le parti sono citate solo dalle loro costituzioni. Ciascuna rinvia i dettagli a leggi non lette: la cittadinanza (la legge costituzionale sudossetina sulla cittadinanza; la legge organica georgiana) e, da entrambe le parti, il servizio militare. Il testo georgiano è la traduzione inglese del Constitute Project: il testo georgiano autentico è pubblicato su matsne.gov.ge, che ha rifiutato il lettore di Solon il giorno della lettura. Ciò che il diritto di ciascuna parte dice degli atti, dei documenti e dei beni nati sotto il diritto dell'altra non è stato letto; è la prossima domanda.",
      ru: "Обе стороны процитированы только по их конституциям. Каждая оставляет подробности законам, которые не прочитаны: о гражданстве (конституционный закон Южной Осетии о гражданстве; органический закон Грузии) и о воинской службе с обеих сторон. Текст Грузии — английский перевод Constitute Project: подлинный текст на грузинском опубликован на matsne.gov.ge, который в день чтения отказал программе Solon. Что право каждой стороны говорит об актах, документах и собственности, оформленных по праву другой, не прочитано; это следующий вопрос.",
    },
  },
]);
