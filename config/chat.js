const BOT_NAME = "letsTalk Bot";

const MESSAGE_HISTORY_LIMIT = 100;

const ALLOWED_REACTIONS = new Set([
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
]);

const DEFAULT_ROOMS = [
  {
    name: "JavaScript",
    slug: "javascript",
    description:
      "Discuss JavaScript, browsers and Node.js.",
  },
  {
    name: "Python",
    slug: "python",
    description:
      "Discuss Python, automation and backend development.",
  },
  {
    name: "PHP",
    slug: "php",
    description:
      "Discuss PHP and server-side development.",
  },
  {
    name: "C#",
    slug: "c-sharp",
    description:
      "Discuss C#, .NET and application development.",
  },
  {
    name: "Ruby",
    slug: "ruby",
    description:
      "Discuss Ruby and Ruby on Rails.",
  },
  {
    name: "Java",
    slug: "java",
    description:
      "Discuss Java and JVM development.",
  },
];

module.exports = {
  BOT_NAME,
  MESSAGE_HISTORY_LIMIT,
  ALLOWED_REACTIONS,
  DEFAULT_ROOMS,
};