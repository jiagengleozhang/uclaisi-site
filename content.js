// Everything the terminal says lives in this file.
//
// Text supports a little inline formatting:
//   **bold**   [label](https://link)   `/command` (becomes a clickable command)
//
// Review markers, on blocks and on list items:
//   status: "draft"  wording Claude wrote that needs your approval
//   status: "todo"   needs information only you have
// Marked items show up with a yellow tag when you run the site locally (localhost), so you
// can review them, and are hidden on the live site. Delete the `status` once an item is
// approved or filled in. Search this file for "TODO(needs info)" to find everything open.

const SITE = {
  name: "UCLAISI",
  term: "Term 1 · 2026/27",
  cwd: "~/ucl/ai-safety",
  whatsapp: "https://uclaisi.org/join", // redirects to the current WhatsApp invite
  luma: "https://lu.ma/UCLAISI",
  // TODO(needs info): the society's email address. /contact shows it once this is filled in.
  email: "",
  // Commands in the line under the prompt, in order.
  nav: ["start", "about", "programme", "events", "join"],
  // Shown greyed out in the empty prompt; Tab fills it in.
  suggestion: "what's on this term?",
};

// Splash lines set into the right end of the prompt's top border, like a game's title screen.
// A different one shows on every visit (never the same twice in a row). Keep them under about
// 35 characters so they fit on phones.
const SPLASHES = [
  "Also try /start!",
  "Reward hacking not included",
  "Sandboxed, as it should be",
  "Not a real model. Promise.",
  "Powered by keyword matching",
  "Evals or it didn't happen",
  "Do not feed the optimiser",
  "Now 12% more interpretable",
  "Outer aligned, inner unsure",
  "Mesa-optimiser free zone",
  "Rated safe by one eval",
  "Built to be overseen",
  "Press tab. Go on.",
  "Hello, Bloomsbury!",
];

// TODO(needs info): any social accounts, e.g. ["Instagram", "https://instagram.com/..."].
// They show up in /contact.
const SOCIALS = [];

// Events on the Luma calendar show up automatically (see sync_luma.py). Add anything that
// isn't on Luma here, like reading groups. Events with a `start` time sort by date and
// disappear once they're over; `date` is for free text like "Tuesdays · 18:00".
const EVENTS = [
  // { start: "2026-10-14T18:00:00+01:00", end: "2026-10-14T19:30:00+01:00", title: "Reading group: ...", place: "Room TBC" },
  // { date: "Tuesdays · 18:00", title: "Weekly reading group", place: "Room TBC" },
];

// TODO(needs info): committee members. They show up in /team.
const TEAM = [
  // { name: "Jane Doe", role: "President", about: "partnerships, speakers, anything else" },
];

// /faq (also `man uclaisi`). Answers without a status are approved: quoted from uclaisi.org
// or confirmed by the committee.
const FAQ = [
  {
    q: "Do I need to sign up for sessions?",
    a: "Large events are ticketed through Luma. No need to sign up for reading groups, discussion groups and socials, just turn up.",
  },
  {
    q: "Where are times and rooms posted?",
    a: "In the WhatsApp group. Times, rooms, paper links and last-minute changes are posted there.",
  },
  {
    q: "What happens at a reading group?",
    a: "One paper, one facilitator, ninety minutes, no lecture.",
  },
  {
    q: "Do I have to read the paper first?",
    a: "Read it beforehand, or don't and come anyway (though you'll have more fun if you do).",
  },
  {
    q: "Do I need a technical background?",
    a: "No. We cover technical AI safety, policy and governance, and philosophy, so there's a way in whatever you study.",
  },
  {
    q: "I'm not sure AI risk is a real problem. Can I still come?",
    a: "Yes, if you're willing to take the arguments seriously and change your mind. We think the risks are real, and sessions assume you're open to learning why.",
  },
  {
    q: "Can you help with fellowship applications?",
    a: "Yes. We run application sessions for fellowships and internships before deadlines, and put you in touch with people who've done the program when we can.",
  },
  {
    q: "Is it free?",
    a: "Yes, it's free.",
  },
  {
    q: "Can non-UCL students come?",
    a: "Yes, students from other universities are welcome too.",
  },
];

// /start: a starting point for each track. `sessions` are names from the programme.
const TRACKS = {
  technical: {
    title: "Technical AI safety",
    blurb: "How AI systems work inside, and how to make them safe.",
    sessions: ["Technical seminars", "Hackathons and sprints", "Weekly reading group"],
    readings: [
      { title: "Concrete Problems in AI Safety", by: "Amodei, Olah et al., 2016", url: "https://arxiv.org/abs/1606.06565", why: "The classic map of practical safety problems: side effects, reward hacking, oversight." },
      { title: "Zoom In: An Introduction to Circuits", by: "Olah et al., 2020", url: "https://distill.pub/2020/circuits/zoom-in/", why: "A readable way into interpretability, the study of what is happening inside a network." },
      { title: "BlueDot Impact courses", by: "BlueDot Impact", url: "https://bluedot.org/", why: "Structured online courses on AI safety, if you want a guided path." },
    ],
  },
  policy: {
    title: "Policy and governance",
    blurb: "Laws, institutions, and who gets to decide how AI is built and used.",
    sessions: ["Governance and policy", "Weekly reading group"],
    readings: [
      { title: "International AI Safety Report", by: "Bengio et al., 2025", url: "https://internationalaisafetyreport.org/", why: "The shared scientific picture of what general-purpose AI can do and where the risks are, written for policymakers." },
      { title: "GovAI research", by: "Centre for the Governance of AI", url: "https://www.governance.ai/research", why: "Research on how institutions can manage advanced AI." },
      { title: "The EU AI Act", by: "text and explainers", url: "https://artificialintelligenceact.eu/", why: "The first broad AI law, and the one most other proposals get compared to." },
    ],
  },
  philosophy: {
    title: "Philosophy",
    blurb: "Values, agency, and what we should want AI systems to do.",
    sessions: ["Weekly reading group", "Governance and policy"],
    readings: [
      { title: "Human Compatible", by: "Stuart Russell, 2019 (book)", why: "Why AI that is certain about its objective is dangerous, and what to build instead." },
      { title: "The Alignment Problem", by: "Brian Christian, 2020 (book)", why: "How machine learning systems end up learning the wrong thing, told through the field's history." },
      { title: "Preventing an AI-related catastrophe", by: "80,000 Hours", url: "https://80000hours.org/problem-profiles/artificial-intelligence/", why: "The case that AI risk is among the most pressing problems, with the strongest objections." },
    ],
  },
};

// Each page is a command (/id) and a URL (#/id).
// `keywords` let plain-English questions ("how do I join?") find the right page: the page whose
// keywords the question mentions most wins, and longer phrases count for more. Words in `boost`
// count double, for words that say what kind of question it is ("when", "where", "join").
const PAGES = [
  {
    id: "start",
    aliases: ["new", "intro"],
    title: "Start here",
    file: "start.md",
    desc: "new to AI safety? pick where to begin",
    keywords: [
      "start", "start here", "new to", "new to ai safety", "into ai safety", "get into", "where do i start",
      "where to start", "how do i start", "where do i begin", "getting started", "get started", "beginner",
      "basics", "intro", "introduction", "learn", "learn more", "learn about", "what should i read",
      "reading list", "recommend", "recommendation", "book", "resource", "course", "crash course",
    ],
    next: ["faq", "events"],
    blocks: [
      { h: "New to AI safety? Pick where you want to start:" },
      { tracks: true },
    ],
  },
  {
    id: "about",
    title: "About",
    file: "README.md",
    desc: "what UCLAISI is and why it exists",
    keywords: [
      "about", "who", "who are you", "what is", "what are", "what is this", "what's this", "mission", "why",
      "goal", "aim", "purpose", "values", "stand for", "society", "club", "uclaisi", "aisi", "initiative",
      "risk", "x-risk", "existential", "dangerous", "matter", "philosophy",
    ],
    next: ["programme", "join"],
    blocks: [
      { h: "AI safety at UCL" },
      { p: "A student group for people interested in working on and thinking about Artificial Intelligence and its risks. Technical AI safety, policy and governance, and philosophy." },
      { h: "Capabilities are moving faster than our understanding of them." },
      { p: "AI systems are being deployed right now before the consequences are fully understood or mitigated. This is a technical, and a policy problem. Much of the useful work yet to do is open and waiting for fresh perspectives." },
      { p: "UCL has one of the best talent bases on earth. We upskill the talented and thoughtful student base of UCL to work on the world's most pressing issues. We are the fastest route into the industry for any UCL student who wants one." },
      { dim: "UCL Students' Union society · Bloomsbury, London WC1E 6BT" },
    ],
  },
  {
    id: "programme",
    aliases: ["program", "programs"],
    title: "Programme",
    file: "programme.md",
    desc: "reading groups, seminars, hackathons and more",
    keywords: [
      "programme", "program", "do you do", "what happens", "activities", "session", "workshop",
      "reading", "reading group", "paper", "discussion", "seminar", "talk", "speaker", "guest speaker",
      "hackathon", "sprint", "project", "research", "build", "eval", "interpretability", "oversight",
      "policy", "governance", "career", "job", "fellowship", "internship", "mentor",
      "social", "dinner", "food", "pizza", "drinks", "pub", "meet people", "make friends", "networking",
    ],
    next: ["events", "join"],
    blocks: [
      { h: "Programme" },
      {
        list: [
          ["Weekly reading group", "One paper, one facilitator, ninety minutes, no lecture. Read it beforehand, or don't and come anyway (though you'll have more fun if you do)."],
          ["Technical seminars", "Speakers from AI labs, AI safety organisations, and inside UCL on interpretability, evaluations and oversight. One talk, one long question and networking session."],
          ["Hackathons and sprints", "A weekend on one problem. An eval, a replication, a small tool. Negative results get written up too."],
          ["Governance and policy", "The occasional reading group will be replaced with a discussion on AI related policy changes and their consequences."],
          ["Careers and opportunities", "Application sessions for students applying to fellowships and internships. A day before the deadline, we look over and perfect applications together, with alumni of the target program joining when we can. Plus talks from fellowship mentors and directors."],
          ["Socials", "Informal meetings and dinners throughout termtime."],
        ],
      },
    ],
  },
  {
    id: "events",
    title: "Events",
    file: "events.md",
    desc: "what's on this term",
    keywords: [
      "event", "when", "when is", "when is the", "when's", "what time", "time", "schedule", "timetable",
      "what's on", "whats on", "on tonight", "what's happening", "whats happening", "happening",
      "this week", "next week", "this term", "tonight", "today", "tomorrow", "next", "upcoming",
      "coming up", "date", "where", "where do you meet", "location", "venue", "room", "building",
      "freshers", "first session", "start of term", "what day", "what day is", "how often", "meet",
      "held", "where are", "this month", "next month", "planned", "plan", "meeting", "meetup",
      "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "weekend",
    ],
    boost: [
      "when", "when is", "when's", "what time", "what day", "what day is", "how often", "where",
      "where are", "held", "today", "tonight", "tomorrow", "this week", "next week",
    ],
    next: ["join", "programme"],
    blocks: [
      { h: SITE.term },
      { p: "Large events are ticketed through Luma. No need to sign up for reading groups, discussion groups and socials, just turn up. Times and rooms are posted here as well as in the WhatsApp group." },
      { h: "What's on" },
      { schedule: "Nothing is scheduled yet. Sessions will appear here once dates are fixed. They are announced in the WhatsApp group first." },
      { links: [["Luma calendar", SITE.luma], ["WhatsApp group", SITE.whatsapp]] },
    ],
  },
  {
    id: "join",
    aliases: ["whatsapp"],
    title: "Join",
    file: "join.md",
    tool: "Fetch(uclaisi.org/join)",
    result: "302 → chat.whatsapp.com",
    desc: "WhatsApp group and Luma calendar",
    keywords: [
      "join", "how do i join", "sign up", "signup", "register", "member", "membership", "become a member",
      "apply", "get involved", "involved", "whatsapp", "group chat", "chat", "discord", "slack",
      "telegram", "mailing list", "newsletter", "subscribe", "invite", "invite link", "qr",
      "want to join", "become part of", "be part of", "add me", "add me to", "the group",
    ],
    boost: ["join", "sign up", "become a member"],
    next: ["events", "programme"],
    blocks: [
      { h: "Join our group on WhatsApp" },
      { p: "Times, rooms, paper links and last-minute changes are posted there." },
      { links: [["WhatsApp group", SITE.whatsapp], ["Luma calendar", SITE.luma]] },
      { qr: "assets/qr-whatsapp.svg", caption: "Scan to join" },
    ],
  },
  {
    id: "luma",
    aliases: ["calendar"],
    title: "Luma",
    tool: "Open(lu.ma/UCLAISI)",
    opens: SITE.luma, // opened in a new tab when someone runs the command
    desc: "open the Luma calendar",
    keywords: [
      "luma", "calendar", "add to calendar", "my calendar", "google calendar", "ical", "ticket", "rsvp",
      "booking", "book a place", "reserve", "sign up for", "register for", "rsvp for", "get a ticket",
    ],
    boost: ["rsvp", "rsvp for", "ticket"],
    next: ["events", "join"],
    blocks: [
      { h: "Follow us on Luma" },
      { p: "Large events are ticketed through Luma." },
      { links: [["Luma calendar", SITE.luma]] },
    ],
  },
  {
    id: "faq",
    aliases: ["man"],
    title: "FAQ",
    file: "faq.md",
    tool: "Bash(man uclaisi)",
    desc: "common questions, as a man page",
    keywords: [
      "faq", "question", "is it free", "free to join", "free", "cost", "how much", "fee", "membership fee",
      "price", "pay", "money", "background", "technical background", "experience", "need experience",
      "not at ucl", "non-ucl", "non ucl", "other universities", "other uni", "outside ucl", "kcl", "king's",
      "imperial", "lse", "postgrad", "phd", "masters", "undergrad", "can i", "can i come", "can anyone",
      "open to", "do i need", "do i have to", "read the paper", "prepare", "do i need to sign up",
      "sceptical", "skeptical", "not sure", "disagree", "application help", "still come", "can i still",
      "don't know", "dont know", "no experience", "know how to code", "code", "is this for me",
      "for me", "only for", "i study", "degree", "subject", "course mate", "computer science", "cs",
      "law", "history", "economics", "medicine", "humanities", "arts",
    ],
    next: ["start", "join"],
    blocks: [{ faq: FAQ }],
  },
  {
    id: "team",
    aliases: ["committee"],
    title: "Team",
    file: "team.md",
    desc: "the committee, and who to ask about what",
    keywords: [
      "team", "committee", "who runs", "run by", "who's in charge", "in charge", "organiser", "organizer",
      "president", "exec", "officer", "leader", "lead", "who leads", "founder", "board", "people behind",
    ],
    next: ["contact", "join"],
    blocks: [
      { h: "Committee" },
      { team: "Committee details are coming soon. In the meantime, ask in the WhatsApp group." },
      { note: "Add committee members to TEAM in content.js.", status: "todo" },
    ],
  },
  {
    id: "contact",
    aliases: ["email"],
    title: "Contact",
    file: "contact.md",
    desc: "email and where to find us",
    keywords: [
      "contact", "email", "e-mail", "mail", "reach", "reach out", "get in touch", "message", "dm",
      "instagram", "insta", "linkedin", "twitter", "social media", "sponsor", "sponsorship", "partner",
      "partnership", "collaborate", "collaboration", "give a talk", "speak at", "press", "journalist",
      "present", "present my", "share my research",
    ],
    next: ["team", "join"],
    blocks: [
      { h: "Contact" },
      { p: "The quickest way to reach us is the WhatsApp group." },
      {
        links: [
          ...(SITE.email ? [["Email", `mailto:${SITE.email}`]] : []),
          ...SOCIALS,
          ["WhatsApp group", SITE.whatsapp],
          ["Luma calendar", SITE.luma],
        ],
      },
      { note: "Add the society email (SITE.email) and any social accounts (SOCIALS) in content.js.", status: "todo" },
    ],
  },
];

// Questions about the terminal itself ("what can you do?") are answered with /help.
const HELP_KEYWORDS = [
  "help", "commands", "command", "what can you do", "what can i ask", "what can i type", "what do i type",
  "how does this work", "how do i use", "how to use", "options", "menu",
];

// Replies for things that aren't questions about the society. First match wins.
const SMALLTALK = [
  { match: /rm\s+-rf/, tool: "Bash(rm -rf /)", result: "Blocked by policy", error: true, text: "Nice try. Oversight works." },
  { match: /^sudo\b/, tool: "Bash(sudo)", result: "Permission denied", error: true, text: "This agent runs sandboxed. As it should." },
  { match: /\b(are you|is this)( an?| a real| actually)? (ai|bot|robot|chatbot|human|real|chatgpt|gpt|claude|llm)\b/,
    text: "No model here: I match what you type to the right page. `/help` lists everything I know." },
  { match: /^(hi|hey|hello|hiya|yo|good (morning|afternoon|evening))\b/, text: "Hi! Ask me what we do, what's on, or how to join." },
  { match: /^(thanks|thank you|thx|ty|cheers)\b/, text: "Anytime. `/join` if you'd like to come along." },
  { match: /^(bye|goodbye|see you|see ya|cya)\b/, text: "See you at the next session. `/events` has what's on." },
  { match: /^pwd$/, text: "~/ucl/ai-safety" },
  { match: /^ping$/, text: "pong" },
  { match: /^whoami\b/, text: "guest, for now. `/join` to change that." },
  { match: /^(exit|quit|:q|logout)\b/, text: "There's no leaving. There is `/join`, though." },
];
