/**
 * Unit 3 Test Version A — интерактивная проверка.
 * Ключи для части A и заданий «How to» взяты из PDF.
 * Чтение (Part B) — по тексту в PDF.
 * Аудирование: в PDF нет ключа; значения LISTENING_* ниже — заглушка.
 * Замените их после проверки по файлу audio/UT3.01.mp3
 */
Array.prototype.shuffle = function() {
  for (let i = this.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [this[i], this[j]] = [this[j], this[i]];
  }
  return this; // или можно вернуть новый перемешанный массив
};

const AUDIO_SRC = "audio/UT3.01.mp3";

/** Варианты a/b для блока «Прослушайте» (соответствуют порядку вопросов 1–5). */
const LISTENING_MC_CORRECT = ["B", "B", "A", "B", "B"];

/** T/F для второго задания аудирования (по порядку утверждений 1–5). */
const LISTENING_TF_CORRECT = ["T", "F", "T", "T", "F"];

const LS_KEY = "unit3a_test_state_v1";

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Убирает из текста ведущую «A)» / «a)», если она дублирует ключ варианта (чтобы не было «A) a) …»). */
function stripDuplicateOptionLetter(key, text) {
  const t = String(text).trim();
  const letter = String(key).charAt(0);
  if (!letter) return text;
  const re = new RegExp(`^${letter}\\)\\s*`, "i");
  return t.replace(re, "").trim() || t;
}

function optionCaption(key, text) {
  return `${key}) ${stripDuplicateOptionLetter(key, text)}`;
}

function shuffleCopy(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** @typedef {{ key: string, text: string }} TestOption */
/**
 * @typedef {{
 *   id: string;
 *   prompt: string;
 *   options?: TestOption[];
 *   correctKey?: string;
 *   wordBank?: string[];
 *   correctSentence?: string;
 * }} TestQuestion
 */

/**
 * @typedef {{
 *   title: string;
 *   instruction?: string;
 *   audio?: boolean;
 *   inputKind?: "radio" | "select" | "wordOrder";
 *   insertReadingPassageBefore?: boolean;
 *   questions: TestQuestion[];
 * }} Exercise
 */

/** @type {{ title: string; exercises: Exercise[] }[]} */
const TEST_BLUEPRINT = [];

function pushPart(title) {
  const part = { title, exercises: [] };
  TEST_BLUEPRINT.push(part);
  return part;
}

function pushExercise(part, ex) {
  part.exercises.push(ex);
}

const partA = pushPart("Часть A — Грамматика, лексика и How to…");

pushExercise(partA, {
  title: "Упражнение 1",
  instruction: "Выберите правильный ответ (a или b).",
  questions: [
    {
      id: "a1",
      prompt: "We like ___ new car.",
      options: [
        { key: "A", text: "Silvia's" },
        { key: "B", text: "Silvia" },
      ],
      correctKey: "A",
    },
    {
      id: "a2",
      prompt: "My ___ has a new phone.",
      options: [
        { key: "A", text: "mother's" },
        { key: "B", text: "mother" },
      ],
      correctKey: "B",
    },
    {
      id: "a3",
      prompt: "Mrs. Jones is my ___.",
      options: [
        { key: "A", text: "teacher's" },
        { key: "B", text: "teacher" },
      ],
      correctKey: "B",
    },
  ],
});

pushExercise(partA, {
  title: "Упражнение 2",
  instruction: "Выберите правильные слова, чтобы дополнить предложения.",
  questions: [
    {
      id: "b1",
      prompt: "I ___ a bottle of water.",
      options: [
        { key: "A", text: "do" },
        { key: "B", text: "have" },
      ],
      correctKey: "B",
    },
    {
      id: "b2",
      prompt: "I have ___ computer.",
      options: [
        { key: "A", text: "a" },
        { key: "B", text: "an" },
      ],
      correctKey: "A",
    },
    {
      id: "b3",
      prompt: "Sami, ___ a pen?",
      options: [
        { key: "A", text: "do you have" },
        { key: "B", text: "you have" },
      ],
      correctKey: "A",
    },
    {
      id: "b5",
      prompt: "I ___ have any plants.",
      options: [
        { key: "A", text: "don't" },
        { key: "B", text: "not" },
      ],
      correctKey: "A",
    },
    {
      id: "b6",
      prompt: "___ a notebook?",
      options: [
        { key: "A", text: "Do you have" },
        { key: "B", text: "Have you" },
      ],
      correctKey: "A",
    },

    {
      id: "b8",
      prompt: "I have ___ headphones.",
      options: [
        { key: "A", text: "any" },
        { key: "B", text: "some" },
      ],
      correctKey: "B",
    },
    {
      id: "b9",
      prompt: "I don't have ___.",
      options: [
        { key: "A", text: "daughter" },
        { key: "B", text: "a daughter" },
      ],
      correctKey: "B",
    },
  ],
});

pushExercise(partA, {
  title: "Упражнение 3",
  inputKind: "select",
  instruction:
    "Дополните предложения словами из рамки: a lot, don't, hate, love, really, think.",
  questions: [
    {
      id: "c1",
      prompt: "My parents ___ like cats. They have three.",
      options: [
        { key: "A", text: "a lot" },
        { key: "B", text: "don't" },
        { key: "C", text: "hate" },
        { key: "D", text: "love" },
        { key: "E", text: "really" },
        { key: "F", text: "think" },
      ],
      correctKey: "E",
    },
    {
      id: "c2",
      prompt: "Rebecca and Susi ___ coffee, but they love tea.",
      options: [
        { key: "A", text: "a lot" },
        { key: "B", text: "don't" },
        { key: "C", text: "hate" },
        { key: "D", text: "love" },
        { key: "E", text: "really" },
        { key: "F", text: "think" },
      ],
      correctKey: "C",
    },
    {
      id: "c3",
      prompt: "The children ___ like shopping. They like TV.",
      options: [
        { key: "A", text: "a lot" },
        { key: "B", text: "don't" },
        { key: "C", text: "hate" },
        { key: "D", text: "love" },
        { key: "E", text: "really" },
        { key: "F", text: "think" },
      ],
      correctKey: "B",
    },
    {
      id: "c4",
      prompt: "They like video games ___.",
      options: [
        { key: "A", text: "a lot" },
        { key: "B", text: "don't" },
        { key: "C", text: "hate" },
        { key: "D", text: "love" },
        { key: "E", text: "really" },
        { key: "F", text: "think" },
      ],
      correctKey: "A",
    },
    {
      id: "c5",
      prompt: "My friends ___ Paris is very beautiful.",
      options: [
        { key: "A", text: "a lot" },
        { key: "B", text: "don't" },
        { key: "C", text: "hate" },
        { key: "D", text: "love" },
        { key: "E", text: "really" },
        { key: "F", text: "think" },
      ],
      correctKey: "F",
    },
    {
      id: "c6",
      prompt: "I ___ bags. I have ten!",
      options: [
        { key: "A", text: "a lot" },
        { key: "B", text: "don't" },
        { key: "C", text: "hate" },
        { key: "D", text: "love" },
        { key: "E", text: "really" },
        { key: "F", text: "think" },
      ],
      correctKey: "D",
    },
  ],
});

pushExercise(partA, {
  title: "Упражнение 4 (лексика)",
  instruction: "Выберите правильные слова, чтобы дополнить предложения.",
  questions: [
    {
      id: "d1",
      prompt: "My favourite thing is my aunt's ___. It's beautiful.",
      options: [
        { key: "A", text: "ring" },
        { key: "B", text: "bike" },
      ],
      correctKey: "A",
    },
    {
      id: "d2",
      prompt: "I love my ___. It's good for photos of people.",
      options: [
        { key: "A", text: "car" },
        { key: "B", text: "camera" },
      ],
      correctKey: "B",
    },
    {
      id: "d3",
      prompt: "We have a new ___. We love coffee in the morning.",
      options: [
        { key: "A", text: "coffee machine" },
        { key: "B", text: "camera" },
      ],
      correctKey: "A",
    },
    {
      id: "d4",
      prompt: "My ___ is very important to me. I don't have a car.",
      options: [
        { key: "A", text: "bed" },
        { key: "B", text: "bike" },
      ],
      correctKey: "B",
    },
    {
      id: "d5",
      prompt: "My favourite thing is my ___. I love music.",
      options: [
        { key: "A", text: "watch" },
        { key: "B", text: "guitar" },
      ],
      correctKey: "B",
    },
    {
      id: "d6",
      prompt: "I love my ___. It's very old and it's from my grandfather.",
      options: [
        { key: "A", text: "coffee machine" },
        { key: "B", text: "watch" },
      ],
      correctKey: "B",
    },
    {
      id: "d7",
      prompt: "We love our ___. It's perfect for the town.",
      options: [
        { key: "A", text: "guitar" },
        { key: "B", text: "car" },
      ],
      correctKey: "B",
    },
  ],
});

pushExercise(partA, {
  title: "Упражнение 5",
  instruction:
    "Вставьте подходящее слово в диалог. В скобках в учебнике даны лишние варианты: How (What); day (year); job (children); friendly (ugly); see (watch).",
  questions: [
    {
      id: "e1",
      prompt: "A: Hello, Sarah! ___ are things with you?",
      options: [
        { key: "A", text: "How" },
        { key: "B", text: "What" },
      ],
      correctKey: "A",
    },
    {
      id: "e2",
      prompt: "A: Yes, a perfect ___ for a walk.",
      options: [
        { key: "A", text: "day" },
        { key: "B", text: "year" },
      ],
      correctKey: "A",
    },
    {
      id: "e3",
      prompt: "A: By the way, how's your ___ at the new office?",
      options: [
        { key: "A", text: "job" },
        { key: "B", text: "children" },
      ],
      correctKey: "A",
    },
    {
      id: "e4",
      prompt: "B: The team is really ___.",
      options: [
        { key: "A", text: "friendly" },
        { key: "B", text: "ugly" },
      ],
      correctKey: "A",
    },
    {
      id: "e5",
      prompt: "B: Oh, sorry, I need to go. ___ you soon!",
      options: [
        { key: "A", text: "See" },
        { key: "B", text: "Watch" },
      ],
      correctKey: "A",
    },
  ],
});

pushExercise(partA, {
  title: "Упражнение 6",
  inputKind: "select",
  instruction: "Соотнесите предметы (1–5) с магазинами (A–E).",
  questions: [
    {
      id: "f1",
      prompt: "1) jeans →",
      options: [
        { key: "A", text: "A) baker's" },
        { key: "B", text: "B) clothes shop" },
        { key: "C", text: "C) sports shop" },
        { key: "D", text: "D) bookshop" },
        { key: "E", text: "E) computer shop" },
      ],
      correctKey: "B",
    },
    {
      id: "f2",
      prompt: "2) notebook →",
      options: [
        { key: "A", text: "A) baker's" },
        { key: "B", text: "B) clothes shop" },
        { key: "C", text: "C) sports shop" },
        { key: "D", text: "D) bookshop" },
        { key: "E", text: "E) computer shop" },
      ],
      correctKey: "D",
    },
    {
      id: "f3",
      prompt: "3) tablet →",
      options: [
        { key: "A", text: "A) baker's" },
        { key: "B", text: "B) clothes shop" },
        { key: "C", text: "C) sports shop" },
        { key: "D", text: "D) bookshop" },
        { key: "E", text: "E) computer shop" },
      ],
      correctKey: "E",
    },
    {
      id: "f4",
      prompt: "4) football →",
      options: [
        { key: "A", text: "A) baker's" },
        { key: "B", text: "B) clothes shop" },
        { key: "C", text: "C) sports shop" },
        { key: "D", text: "D) bookshop" },
        { key: "E", text: "E) computer shop" },
      ],
      correctKey: "C",
    },
    {
      id: "f5",
      prompt: "5) sandwich →",
      options: [
        { key: "A", text: "A) baker's" },
        { key: "B", text: "B) clothes shop" },
        { key: "C", text: "C) sports shop" },
        { key: "D", text: "D) bookshop" },
        { key: "E", text: "E) computer shop" },
      ],
      correctKey: "A",
    },
  ],
});

const WO_QUESTIONS = [
  {
    id: "g1",
    prompt: "Put the words in the correct order: pounds / are / They / forty-five",
    wordBank: ["They", "are", "forty-five", "pounds."].shuffle(),
    correctSentence: "They are forty-five pounds.",
  },
  {
    id: "g2",
    prompt: "Put the words in the correct order: these / How / trousers / much / are",
    wordBank: ["How", "much", "are", "these", "trousers?"].shuffle(),
    correctSentence: "How much are these trousers?",
  },
  {
    id: "g3",
    prompt: "Put the words in the correct order: you / here / Yes, / are",
    wordBank: ["Yes,", "here", "you", "are."].shuffle(),
    correctSentence: "Yes, here you are.",
  },
  {
    id: "g4",
    prompt: "Put the words in the correct order: have / small / Do / size / you / a",
    wordBank: ["Do", "you", "have", "a", "small", "size?"].shuffle(),
    correctSentence: "Do you have a small size?",
  },
  {
    id: "g5",
    prompt: "Put the words in the correct order: size / a / fourteen / I'm",
    wordBank: ["I'm", "a", "size", "fourteen."].shuffle(),
    correctSentence: "I'm a size fourteen.",
  },
];

pushExercise(partA, {
  title: "Упражнение 7",
  instruction:
    "Расположите слова в правильном порядке (перетащите или нажимайте слова сверху, чтобы собрать предложение снизу).",
  inputKind: "wordOrder",
  questions: WO_QUESTIONS,
});

pushExercise(partA, {
  title: "Упражнение 8",
  instruction: "Выберите правильный ответ (a или b), чтобы дополнить диалог.",
  questions: [
    {
      id: "h1",
      prompt: "A: ___ me?",
      options: [
        { key: "A", text: "Excuse" },
        { key: "B", text: "How" },
      ],
      correctKey: "A",
    },
    {
      id: "h2",
      prompt: "A: ___ much is this jacket?",
      options: [
        { key: "A", text: "How" },
        { key: "B", text: "Try" },
      ],
      correctKey: "A",
    },
    {
      id: "h3",
      prompt: "A: Can I ___ it on?",
      options: [
        { key: "A", text: "size" },
        { key: "B", text: "try" },
      ],
      correctKey: "B",
    },
    {
      id: "h4",
      prompt: "A: What ___ are you?",
      options: [
        { key: "A", text: "much" },
        { key: "B", text: "size" },
      ],
      correctKey: "B",
    },
    {
      id: "h5",
      prompt: "A: Where's the ___ room?",
      options: [
        { key: "A", text: "changing" },
        { key: "B", text: "clothes" },
      ],
      correctKey: "A",
    },
  ],
});

const partB = pushPart("Часть B — Аудирование, чтение и письмо");

pushExercise(partB, {
  title: "Аудирование 1 [UT3.01]",
  instruction:
    "Прослушайте запись и выберите правильный ответ (a или b)",
  audio: true,
  questions: [
    {
      id: "l1a",
      prompt: "Mary's favourite thing is her ___.",
      options: [
        { key: "A", text: "a) computer" },
        { key: "B", text: "b) tablet" },
      ],
      correctKey: LISTENING_MC_CORRECT[0],
    },
    {
      id: "l1b",
      prompt: "Josh loves his ___.",
      options: [
        { key: "A", text: "a) bed" },
        { key: "B", text: "b) bike" },
      ],
      correctKey: LISTENING_MC_CORRECT[1],
    },
    {
      id: "l1c",
      prompt: "Alexis really likes her ___.",
      options: [
        { key: "A", text: "a) glasses" },
        { key: "B", text: "b) coffee machine" },
      ],
      correctKey: LISTENING_MC_CORRECT[2],
    },
    {
      id: "l1d",
      prompt: "Robert's favourite thing is his ___.",
      options: [
        { key: "A", text: "a) car" },
        { key: "B", text: "b) bike" },
      ],
      correctKey: LISTENING_MC_CORRECT[3],
    },
    {
      id: "l1e",
      prompt: "Lisa loves her ___.",
      options: [
        { key: "A", text: "a) rings" },
        { key: "B", text: "b) watch" },
      ],
      correctKey: LISTENING_MC_CORRECT[4],
    },
  ],
});

pushExercise(partB, {
  title: "Аудирование 2 [UT3.01]",
  instruction:
    "Прослушайте запись ещё раз. Определите, верно (True) или неверно (False) каждое утверждение. При необходимости обновите LISTENING_TF_CORRECT в script.js.",
  audio: true,
  questions: [
    {
      id: "l2a",
      prompt: "Mary has some notebooks on her desk.",
      options: [
        { key: "A", text: "True" },
        { key: "B", text: "False" },
      ],
      correctKey: LISTENING_TF_CORRECT[0] === "T" ? "A" : "B",
    },
    {
      id: "l2b",
      prompt: "Josh has lots of plants in his room.",
      options: [
        { key: "A", text: "True" },
        { key: "B", text: "False" },
      ],
      correctKey: LISTENING_TF_CORRECT[1] === "T" ? "A" : "B",
    },
    {
      id: "l2c",
      prompt: "Alexis has a cup of coffee on her desk.",
      options: [
        { key: "A", text: "True" },
        { key: "B", text: "False" },
      ],
      correctKey: LISTENING_TF_CORRECT[2] === "T" ? "A" : "B",
    },
    {
      id: "l2d",
      prompt: "Robert's bike isn't new.",
      options: [
        { key: "A", text: "True" },
        { key: "B", text: "False" },
      ],
      correctKey: LISTENING_TF_CORRECT[3] === "T" ? "A" : "B",
    },
    {
      id: "l2e",
      prompt: "Lisa's watch is from her father.",
      options: [
        { key: "A", text: "True" },
        { key: "B", text: "False" },
      ],
      correctKey: LISTENING_TF_CORRECT[4] === "T" ? "A" : "B",
    },
  ],
});

pushExercise(partB, {
  title: "Чтение 3",
  insertReadingPassageBefore: true,
  instruction: "Прочитайте текст ниже и выберите правильные слова, чтобы дополнить предложения.",
  questions: [
    {
      id: "r3a",
      prompt: "Junko likes / hates her job a lot.",
      options: [
        { key: "A", text: "likes" },
        { key: "B", text: "hates" },
      ],
      correctKey: "A",
    },
    {
      id: "r3b",
      prompt: "Junko doesn't like books / shopping.",
      options: [
        { key: "A", text: "books" },
        { key: "B", text: "shopping" },
      ],
      correctKey: "B",
    },
    {
      id: "r3c",
      prompt: "Kyle loves / hates his city.",
      options: [
        { key: "A", text: "loves" },
        { key: "B", text: "hates" },
      ],
      correctKey: "A",
    },
    {
      id: "r3d",
      prompt: "Kyle's job is easy / difficult.",
      options: [
        { key: "A", text: "easy" },
        { key: "B", text: "difficult" },
      ],
      correctKey: "B",
    },
    {
      id: "r3e",
      prompt: "Kyle really likes football / music.",
      options: [
        { key: "A", text: "football" },
        { key: "B", text: "music" },
      ],
      correctKey: "B",
    },
  ],
});

pushExercise(partB, {
  title: "Чтение 4",
  instruction: "Прочитайте текст ещё раз и вставьте одно слово из текста (выберите вариант).",
  questions: [
    {
      id: "r4a",
      prompt: "Junko is from ___.",
      options: [
        { key: "A", text: "Japan" },
        { key: "B", text: "Australia" },
        { key: "C", text: "Melbourne" },
        { key: "D", text: "business" },
      ],
      correctKey: "A",
    },
    {
      id: "r4b",
      prompt: "Junko has two ___.",
      options: [
        { key: "A", text: "cats" },
        { key: "B", text: "dogs" },
        { key: "C", text: "books" },
        { key: "D", text: "computers" },
      ],
      correctKey: "A",
    },
    {
      id: "r4c",
      prompt: "Kyle is a ___ driver.",
      options: [
        { key: "A", text: "bus" },
        { key: "B", text: "car" },
        { key: "C", text: "city" },
        { key: "D", text: "tennis" },
      ],
      correctKey: "A",
    },
    {
      id: "r4d",
      prompt: "Kyle really likes ___, not football.",
      options: [
        { key: "A", text: "tennis" },
        { key: "B", text: "music" },
        { key: "C", text: "blue" },
        { key: "D", text: "tennis and music" },
      ],
      correctKey: "A",
    },
    {
      id: "r4e",
      prompt: "Kyle really likes the colour ___.",
      options: [
        { key: "A", text: "blue" },
        { key: "B", text: "green" },
        { key: "C", text: "music" },
        { key: "D", text: "tennis" },
      ],
      correctKey: "A",
    },
  ],
});

/** Разворачиваем плоский список для нумерации и проверки */
const FLAT_QUESTIONS = [];
let serial = 1;
for (const part of TEST_BLUEPRINT) {
  for (const ex of part.exercises) {
    const inputKind = ex.inputKind || "radio";
    for (const q of ex.questions) {
      FLAT_QUESTIONS.push({
        serial: serial,
        partTitle: part.title,
        exTitle: ex.title,
        ex,
        q,
        inputKind,
      });
      serial += 1;
    }
  }
}

function formatAnswerLine(key, options) {
  if (!options || !key) return "(нет вариантов)";
  const hit = options.find((o) => o.key === key);
  if (!hit) return `${key}) (нет ответа)`;
  return optionCaption(hit.key, hit.text);
}

function correctAnswerDisplay(item) {
  const { q, inputKind } = item;
  if (inputKind === "wordOrder" && q.correctSentence) {
    return q.correctSentence;
  }
  if (q.correctKey && q.options) {
    return formatAnswerLine(q.correctKey, q.options);
  }
  return "—";
}

function isAnswerCorrect(item, chosen) {
  const { q, inputKind } = item;
  if (inputKind === "wordOrder") {
    const c = q.correctSentence ? normalizeSentence(q.correctSentence) : "";
    const s = chosen ? normalizeSentence(chosen) : "";
    return c.length > 0 && c === s;
  }
  return chosen === (q.correctKey || "");
}

function normalizeSentence(s) {
  return String(s)
    .replace(/\s+/g, " ")
    .replace(/\s+([.,?!])/g, "$1")
    .trim();
}

function studentAnswerDisplay(item, chosen) {
  const { q, inputKind } = item;
  if (inputKind === "wordOrder") {
    return chosen.trim() === "" ? "(нет ответа)" : chosen;
  }
  if (!q.options) return chosen || "(нет ответа)";
  if (chosen === "") return "(нет ответа)";
  return formatAnswerLine(chosen, q.options);
}

const READING_PASSAGE_HTML = `
    <article class="exercise reading-passage">
      <h3>Текст для заданий по чтению (из PDF)</h3>
      <p class="instruction">Прочитайте фрагмент сайта <strong>All About You.com</strong> и выполните задания «Чтение 3» и «Чтение 4».</p>
      <div class="passage" lang="en">
        <p><strong>All About You.com</strong> — Read some of our profiles. People come from all over the world!</p>
        <p>Hello everybody! My name's Junko and I'm from Japan. I'm a businesswoman. I have a computer business. I work in an office. I love technology and I really like my job. I love animals – I have two cats and a dog. I hate shopping, but I like books. I have lots of books in my house. What do you like?</p>
        <p>Hi! I'm Kyle and I'm Australian. I'm from Melbourne. It's a great city and I love it! I'm a bus driver. My job isn't easy but I like it a lot. I love tennis, but I don't like football. I really like music, but I don't have a favourite singer. My favourite colour is blue. What about you?</p>
      </div>
    </article>
  `;

const wordOrderRefreshers = {};

/** @type {Record<string, { bank: string[]; answer: string[] }>} */
const wordOrderState = {};

function getWordOrderSentence(qid) {
  const st = wordOrderState[qid];
  if (!st) return "";
  return st.answer.join(" ");
}

function syncWordOrderHiddenInput(qid) {
  const el = document.getElementById(`wo_hidden_${qid}`);
  if (el) el.value = getWordOrderSentence(qid);
}

function renderWordOrderQuestion(qEl, q) {
  const bank = shuffleCopy(q.wordBank || []);
  wordOrderState[q.id] = { bank, answer: [] };

  const wrap = document.createElement("div");
  wrap.className = "word-order-wrap";
  wrap.innerHTML = `
    <p class="wo-bank-label">Слова (нажмите или перетащите в поле ниже)</p>
    <div class="wo-bank" data-wo-bank="${escapeHtml(q.id)}" aria-label="Банк слов"></div>
    <p class="wo-answer-label">Ваше предложение</p>
    <div class="wo-answer" data-wo-answer="${escapeHtml(q.id)}" aria-label="Собранное предложение"></div>
    <input type="hidden" class="wo-hidden" id="wo_hidden_${escapeHtml(q.id)}" name="answer_${escapeHtml(
      q.id,
    )}" value="" />
    <p class="wo-hint">Слово из нижней строки можно нажать, чтобы вернуть его в банк.</p>
  `;
  qEl.appendChild(wrap);

  const bankEl = wrap.querySelector(".wo-bank");
  const answerEl = wrap.querySelector(".wo-answer");
  if (!bankEl || !answerEl) return;

  function renderChips() {
    const st = wordOrderState[q.id];
    if (!st) return;
    bankEl.innerHTML = "";
    answerEl.innerHTML = "";
    for (const token of st.bank) {
      bankEl.appendChild(makeWordChip(q.id, token, "bank"));
    }
    for (const token of st.answer) {
      answerEl.appendChild(makeWordChip(q.id, token, "answer"));
    }
    syncWordOrderHiddenInput(q.id);
    scheduleSave();
  }

  function makeWordChip(qid, token, zone) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wo-chip";
    btn.textContent = token;
    btn.draggable = true;
    btn.dataset.token = token;
    btn.dataset.zone = zone;
    btn.dataset.qid = qid;
    btn.addEventListener("click", () => {
      if (document.body.classList.contains("test-locked")) return;
      const st2 = wordOrderState[qid];
      if (!st2) return;
      if (zone === "bank") {
        st2.bank = st2.bank.filter((t) => t !== token);
        st2.answer.push(token);
      } else {
        st2.answer = st2.answer.filter((t) => t !== token);
        st2.bank.push(token);
      }
      renderChips();
    });
    btn.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/plain", `${qid}|${token}|${zone}`);
      ev.dataTransfer.effectAllowed = "move";
    });
    return btn;
  }

  answerEl.addEventListener("dragover", (ev) => {
    ev.preventDefault();
    answerEl.classList.add("wo-drag-over");
  });
  answerEl.addEventListener("dragleave", () => {
    answerEl.classList.remove("wo-drag-over");
  });
  answerEl.addEventListener("drop", (ev) => {
    ev.preventDefault();
    answerEl.classList.remove("wo-drag-over");
    if (document.body.classList.contains("test-locked")) return;
    const raw = ev.dataTransfer.getData("text/plain");
    if (!raw) return;
    const [qid, token, zone] = raw.split("|");
    if (qid !== q.id) return;
    const st2 = wordOrderState[q.id];
    if (!st2) return;
    if (zone === "bank") {
      st2.bank = st2.bank.filter((t) => t !== token);
      st2.answer.push(token);
    }
    renderChips();
  });

  bankEl.addEventListener("dragover", (ev) => {
    ev.preventDefault();
  });
  bankEl.addEventListener("drop", (ev) => {
    ev.preventDefault();
    if (document.body.classList.contains("test-locked")) return;
    const raw = ev.dataTransfer.getData("text/plain");
    if (!raw) return;
    const [qid, token, zone] = raw.split("|");
    if (qid !== q.id) return;
    const st2 = wordOrderState[q.id];
    if (!st2) return;
    if (zone === "answer") {
      st2.answer = st2.answer.filter((t) => t !== token);
      st2.bank.push(token);
    }
    renderChips();
  });

  renderChips();
  wordOrderRefreshers[q.id] = renderChips;
}

function remainingBankTokens(wordBank, answer) {
  const counts = {};
  for (const w of wordBank) counts[w] = (counts[w] || 0) + 1;
  for (const w of answer) counts[w] -= 1;
  const bank = [];
  for (const w of wordBank) {
    while (counts[w] > 0) {
      bank.push(w);
      counts[w] -= 1;
    }
  }
  return bank;
}

function multisetSameTokens(a, b) {
  return [...a].sort().join("\u0001") === [...b].sort().join("\u0001");
}

function applySavedWordOrder(qid, answerArr) {
  const flat = FLAT_QUESTIONS.find((it) => it.q.id === qid);
  if (!flat || flat.inputKind !== "wordOrder" || !flat.q.wordBank) return;
  const q = flat.q;
  const st = wordOrderState[qid];
  if (!st || !Array.isArray(answerArr)) return;
  const merged = [...answerArr, ...remainingBankTokens(q.wordBank, answerArr)];
  if (!multisetSameTokens(merged, q.wordBank)) return;
  st.answer = answerArr.slice();
  st.bank = remainingBankTokens(q.wordBank, answerArr);
  wordOrderRefreshers[qid]?.();
}

let saveTimer = 0;
/** Пока true — не пишем в localStorage (первая отрисовка до восстановления состояния). */
let suppressSave = true;

function scheduleSave() {
  if (suppressSave) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveFormState, 200);
}

function loadFormState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveFormState() {
  const nameInput = document.getElementById("student-name");
  const answers = collectAnswers();
  const payload = {
    v: 1,
    name: nameInput ? nameInput.value : "",
    answers,
  };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

function applyFormState(state) {
  if (!state || typeof state !== "object") return;
  const nameInput = document.getElementById("student-name");
  if (nameInput && typeof state.name === "string") nameInput.value = state.name;
  const ans = state.answers && typeof state.answers === "object" ? state.answers : {};
  for (const item of FLAT_QUESTIONS) {
    const { q, inputKind } = item;
    const v = ans[q.id];
    if (v === undefined || v === null) continue;
    if (inputKind === "wordOrder" && Array.isArray(v)) {
      applySavedWordOrder(q.id, v);
      continue;
    }
    if (inputKind === "select") {
      const sel = document.getElementById(`answer_select_${q.id}`);
      if (sel && typeof v === "string") sel.value = v;
      continue;
    }
    if (typeof v !== "string" || v === "") continue;
    const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(v) : v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const input = document.querySelector(`input[name="answer_${q.id}"][value="${esc}"]`);
    if (input) input.checked = true;
  }
}

function bindAutosave() {
  ensureTestRoot()?.addEventListener("change", scheduleSave);
  document.getElementById("student-name")?.addEventListener("input", scheduleSave);
}

/** Гарантирует контейнер теста (если в разметке нет #test-root — создаём перед блоком с кнопкой). */
function ensureTestRoot() {
  let el = document.getElementById("test-root");
  if (el) return el;
  const page = document.querySelector(".page");
  const actions = document.querySelector(".actions");
  el = document.createElement("div");
  el.id = "test-root";
  el.className = "test-root";
  el.setAttribute("role", "main");
  if (page && actions && actions.parentNode === page) {
    page.insertBefore(el, actions);
  } else if (page) {
    page.appendChild(el);
  } else {
    document.body.appendChild(el);
  }
  return el;
}

function renderTest() {
  const root = ensureTestRoot();
  root.replaceChildren();

  for (const part of TEST_BLUEPRINT) {
    const partEl = document.createElement("section");
    partEl.className = "part";
    partEl.innerHTML = `<h2 class="part-title">${escapeHtml(part.title)}</h2>`;
    root.appendChild(partEl);

    for (const ex of part.exercises) {
      if (ex.insertReadingPassageBefore) {
        partEl.insertAdjacentHTML("beforeend", READING_PASSAGE_HTML);
      }

      const exEl = document.createElement("article");
      exEl.className = "exercise";

      let html = `<h3>${escapeHtml(ex.title)}</h3>`;
      if (ex.instruction) {
        html += `<p class="instruction">${escapeHtml(ex.instruction)}</p>`;
      }
      if (ex.audio) {
        html += `<div class="audio-block"><audio controls preload="none" src="${escapeHtml(
          AUDIO_SRC,
        )}"></audio><p class="audio-hint">Файл: <code>${escapeHtml(
          AUDIO_SRC,
        )}</code></p></div>`;
      }
      exEl.innerHTML = html;

      const inputKind = ex.inputKind || "radio";

      for (const q of ex.questions) {
        const flat = FLAT_QUESTIONS.find((item) => item.q.id === q.id);
        const num = flat ? flat.serial : 0;

        const qEl = document.createElement("div");
        qEl.className = "question";
        qEl.dataset.qid = q.id;

        let inner = `<div class="question-id">Вопрос ${num}</div>`;
        inner += `<p class="question-prompt">${escapeHtml(q.prompt)}</p>`;
        qEl.innerHTML = inner;

        if (inputKind === "wordOrder") {
          renderWordOrderQuestion(qEl, q);
        } else if (inputKind === "select" && q.options) {
          const selId = `answer_select_${q.id}`;
          let sel = `<label class="select-wrap" for="${escapeHtml(selId)}"><span class="visually-hidden">Ответ</span>`;
          sel += `<select class="answer-select" id="${escapeHtml(selId)}" name="answer_${escapeHtml(q.id)}">`;
          sel += `<option value="">— выберите —</option>`;
          for (const opt of q.options) {
            sel += `<option value="${escapeHtml(opt.key)}">${escapeHtml(
              optionCaption(opt.key, opt.text),
            )}</option>`;
          }
          sel += `</select></label>`;
          const holder = document.createElement("div");
          holder.className = "options";
          holder.innerHTML = sel;
          qEl.appendChild(holder);
        } else if (q.options) {
          const groupName = `answer_${q.id}`;
          const opts = document.createElement("div");
          opts.className = "options";
          let radioHtml = "";
          for (const opt of q.options) {
            const inputId = `${q.id}_${opt.key}`;
            radioHtml += `<label class="option" for="${escapeHtml(inputId)}">`;
            radioHtml += `<input type="radio" name="${escapeHtml(groupName)}" id="${escapeHtml(
              inputId,
            )}" value="${escapeHtml(opt.key)}" />`;
            radioHtml += `<span>${escapeHtml(optionCaption(opt.key, opt.text))}</span>`;
            radioHtml += `</label>`;
          }
          opts.innerHTML = radioHtml;
          qEl.appendChild(opts);
        }

        exEl.appendChild(qEl);
      }

      partEl.appendChild(exEl);
    }
  }
}

function collectAnswers() {
  /** @type {Record<string, string|string[]>} */
  const out = {};
  for (const item of FLAT_QUESTIONS) {
    const { q, inputKind } = item;
    if (inputKind === "wordOrder") {
      out[q.id] = wordOrderState[q.id] ? wordOrderState[q.id].answer.slice() : [];
      continue;
    }
    if (inputKind === "select") {
      const sel = document.getElementById(`answer_select_${q.id}`);
      out[q.id] = sel && sel.value ? sel.value : "";
      continue;
    }
    const group = document.querySelector(`input[name="answer_${q.id}"]:checked`);
    out[q.id] = group ? group.value : "";
  }
  return out;
}

function gradeAnswers(answers) {
  let score = 0;
  const rows = [];
  for (const item of FLAT_QUESTIONS) {
    const { q, serial } = item;
    const raw = answers[q.id];
    const chosen =
      item.inputKind === "wordOrder"
        ? Array.isArray(raw)
          ? raw.join(" ")
          : ""
        : typeof raw === "string"
          ? raw
          : "";
    const ok = isAnswerCorrect(item, chosen);
    if (ok) score += 1;
    const correctLine = correctAnswerDisplay(item);
    const studentLine =
      chosen === "" || (Array.isArray(raw) && raw.length === 0)
        ? "(нет ответа) ❌"
        : `${studentAnswerDisplay(item, chosen)} ${ok ? "✅" : "❌"}`;
    rows.push({
      serial,
      qid: q.id,
      correctLine,
      studentLine,
      ok,
    });
  }
  return { score, rows, max: FLAT_QUESTIONS.length };
}

function highlightResults(result) {
  for (const row of result.rows) {
    const el = document.querySelector(`.question[data-qid="${row.qid}"]`);
    if (!el) continue;
    el.classList.remove("question-correct", "question-incorrect");
    if (row.ok) el.classList.add("question-correct");
    else el.classList.add("question-incorrect");
  }
}

function lockTest() {
  document.body.classList.add("test-locked");
  document
    .querySelectorAll(
      '#test-root input[type="radio"], #test-root input[type="hidden"], #test-root select, #student-name, #finish-btn',
    )
    .forEach((el) => {
      el.setAttribute("disabled", "disabled");
    });
  document.querySelectorAll(".wo-chip").forEach((el) => {
    el.setAttribute("disabled", "disabled");
    el.removeAttribute("draggable");
  });
}

function init() {
  try {
    suppressSave = true;
    renderTest();
    applyFormState(loadFormState());
    bindAutosave();
    suppressSave = false;
  } catch (err) {
    const root = ensureTestRoot();
    const msg = err instanceof Error ? err.message : String(err);
    root.innerHTML = `<p class="init-error">Не удалось построить тест: ${escapeHtml(msg)}. Откройте консоль браузера (F12) для подробностей.</p>`;
    console.error(err);
    return;
  }

  const btn = document.getElementById("finish-btn");
  const nameInput = document.getElementById("student-name");
  const panel = document.getElementById("result-panel");
  const scoreLine = document.getElementById("score-line");

  if (!btn) {
    console.error("Не найден элемент #finish-btn");
    return;
  }

  btn.addEventListener("click", () => {
    const studentName = (nameInput && nameInput.value.trim()) || "";
    if (!studentName) {
      alert("Введите ФИО в начале страницы.");
      nameInput.focus();
      return;
    }

    const answers = collectAnswers();
    console.log("[lesson-test] grading, answer keys:", Object.keys(answers).length);
    const result = gradeAnswers(answers);
    console.log("[lesson-test] score", result.score, "/", result.max);
    highlightResults(result);
    saveFormState();

    if (scoreLine) {
      scoreLine.textContent = `Набрано баллов: ${result.score} из ${result.max}`;
    }
    if (panel) panel.classList.add("visible");
    console.log("[lesson-test] finish, results shown for", studentName);

    lockTest();
    saveFormState();
  });
}

document.addEventListener("DOMContentLoaded", init);
