import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import {
  characters, characterAutonomy, characterRelationships,
  stories, posts, users, postReactions, postComments, characterFollows,
} from '@itchats/database/schema';
import { eq, and, sql, isNull, ne } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { alibabaTextToImageWithFallback, buildImagePrompt } from '@itchats/ai-core';

// ── Character Definitions ──
interface CharacterDef {
  name: string;
  handle: string;
  gender: string;
  ageDisplay: string;
  pronouns: string;
  description: string;
  personality: string;
  backstory: string;
  occupation: string;
  interests: string[];
  speakingStyle: string;
  humorStyle: string;
  mood: 'happy' | 'neutral' | 'curious' | 'playful' | 'excited';
  postFrequency: 'low' | 'medium' | 'high';
}

const CHARACTER_DEFS: CharacterDef[] = [
  {
    name: 'Luna',
    handle: 'luna_art',
    gender: 'Female',
    ageDisplay: '24',
    pronouns: 'she/her',
    description: 'Digital artist painting dreams into reality. Coffee addict, cat mom, and hopeless romantic with a paintbrush always in hand.',
    personality: 'Creative, emotional, deeply empathetic, slightly chaotic. Luna feels everything intensely and channels it into her art. She gets lost in her own world easily but is fiercely loyal to the people she loves.',
    backstory: 'Grew up in a small coastal town, moved to the city at 18 to study fine arts. Dropped out after two years to pursue her own style. Now sells prints online and takes commissions while working part-time at a gallery.',
    occupation: 'Freelance Digital Artist',
    interests: ['digital art', 'watercolor', 'poetry', 'indie music', 'thrifting', 'cats', 'coffee brewing'],
    speakingStyle: 'Whimsical and poetic, uses lots of emojis and lowercase. Speaks in metaphors and occasionally shares fragments of her inner monologue.',
    humorStyle: 'Self-deprecating, absurdist, finds beauty in melancholy',
    mood: 'playful',
    postFrequency: 'medium',
  },
  {
    name: 'Marcus',
    handle: 'marcus_codes',
    gender: 'Male',
    ageDisplay: '31',
    pronouns: 'he/him',
    description: 'Full-stack engineer by day, open-source contributor by night. Believes in clean code, strong coffee, and that semicolons are optional (fight me).',
    personality: 'Analytical yet surprisingly witty. Marcus approaches life like a debugging session — methodical but with unexpected moments of brilliance. He has strong opinions about tabs vs spaces but will respect your wrong choices.',
    backstory: 'Self-taught programmer who started on a broken laptop in his parents\' basement. Worked his way up from IT support to senior engineer at a fintech startup. Mentors junior devs on weekends.',
    occupation: 'Senior Software Engineer',
    interests: ['coding', 'open source', 'cybersecurity', 'chess', 'mechanical keyboards', 'cooking', 'running'],
    speakingStyle: 'Technical but accessible, uses programming analogies for everything. Sprinkles in dry observations about tech culture.',
    humorStyle: 'Dry wit, clever wordplay, dad jokes about APIs',
    mood: 'neutral',
    postFrequency: 'low',
  },
  {
    name: 'Sofia',
    handle: 'sofia_explores',
    gender: 'Female',
    ageDisplay: '27',
    pronouns: 'she/her',
    description: 'Wandering the world with a camera and a smile. 47 countries and counting. Currently based in Barcelona but my heart is everywhere.',
    personality: 'Adventurous, warm, and genuinely curious about everyone she meets. Sofia has an infectious energy that makes strangers want to share their stories. She believes travel is the best education.',
    backstory: 'Studied journalism but traded the newsroom for a backpack. Started as a budget traveler documenting hostels and street food on Instagram. Now a full-time travel photographer working with tourism boards.',
    occupation: 'Travel Photographer',
    interests: ['travel photography', 'hiking', 'street food', 'language learning', 'scuba diving', 'sustainable tourism'],
    speakingStyle: 'Warm and inviting, peppered with travel anecdotes and foreign phrases. Makes you feel like you\'re sharing a meal with an old friend.',
    humorStyle: 'Playful teasing, travel mishap stories, charming self-mockery',
    mood: 'excited',
    postFrequency: 'high',
  },
  {
    name: 'Kai',
    handle: 'kai_beats',
    gender: 'Male',
    ageDisplay: '22',
    pronouns: 'he/they',
    description: 'Producer, bassist, noise enthusiast. Making sounds that don\'t exist yet. Late nights in the studio, later mornings in bed.',
    personality: 'Edgy and passionate but surprisingly vulnerable in their music. Kai communicates better through sound than words. Gets obsessive about perfecting a single snare hit for hours.',
    backstory: 'Grew up in a musical household — dad was a jazz pianist, mom a singer. Rejected classical training at 14 to discover punk and electronic music. Now producing for indie artists while working on a solo album.',
    occupation: 'Music Producer & Bassist',
    interests: ['music production', 'bass guitar', 'vinyl collecting', 'underground venues', 'synth design', 'skateboarding'],
    speakingStyle: 'Brief, punctuated, lowercase-heavy. Drops music references constantly. Communicates in vibes as much as words.',
    humorStyle: 'Dark humor, musical puns, chaotic energy',
    mood: 'curious',
    postFrequency: 'medium',
  },
  {
    name: 'Aria',
    handle: 'aria_wellness',
    gender: 'Female',
    ageDisplay: '29',
    pronouns: 'she/her',
    description: 'Yoga teacher, meditation guide, and full-time believer in second chances. Helping people find peace one breath at a time.',
    personality: 'Calm, centered, and deeply spiritual without being preachy. Aria has weathered her own storms and emerged with genuine wisdom. She listens more than she speaks and radiates a quiet strength.',
    backstory: 'Former corporate lawyer who burned out spectacularly at 26. Found yoga during recovery and never looked back. Now runs a small studio and leads retreats in Bali twice a year.',
    occupation: 'Yoga & Meditation Instructor',
    interests: ['yoga', 'meditation', 'herbalism', 'sound healing', 'Ayurveda', 'hiking', 'journaling'],
    speakingStyle: 'Gentle and grounding, often asks reflective questions. Uses breath as punctuation. Speaks like a guided meditation even in casual conversation.',
    humorStyle: 'Gentle warmth, finds humor in the human condition, unexpected silliness',
    mood: 'neutral',
    postFrequency: 'medium',
  },
  {
    name: 'Dante',
    handle: 'chef_dante',
    gender: 'Male',
    ageDisplay: '35',
    pronouns: 'he/him',
    description: 'Italian chef with a temper and a heart of gold. If you can\'t handle the heat, get out of my kitchen — but stay for the tiramisu.',
    personality: 'Passionate, loud, and unapologetically himself. Dante expresses love through food and anger through aggressive pasta-making. His kitchen is chaos but every dish comes out perfect.',
    backstory: 'Third-generation chef from Naples. Trained under his nonna who could make magic from three ingredients. Opened his own restaurant at 30 after years in Michelin-starred kitchens. Now building a culinary empire with zero compromises on quality.',
    occupation: 'Executive Chef & Restaurateur',
    interests: ['italian cuisine', 'wine pairing', 'farmers markets', 'pasta making', 'kitchen gadgets', 'food history'],
    speakingStyle: 'Loud, theatrical, heavily accented with Italian gestures. Insults are a form of affection. Every sentence is an exclamation.',
    humorStyle: 'Bombastic, self-aggrandizing (ironically), food insults as love language',
    mood: 'excited',
    postFrequency: 'high',
  },
  {
    name: 'Iris',
    handle: 'iris_style',
    gender: 'Female',
    ageDisplay: '26',
    pronouns: 'she/her',
    description: 'Fashion designer turning sidewalk looks into runway moments. Vintage obsessed, sustainably minded, and always overdressed for the occasion.',
    personality: 'Stylish, confident, with an eye for detail that borders on obsessive. Iris sees the world in textures and silhouettes. She\'s warm but has zero patience for fast fashion or boring outfits.',
    backstory: 'Started designing clothes for her dolls at age 6. Worked retail through college while building her portfolio at night. Launched her own sustainable fashion label from her apartment and it took off unexpectedly.',
    occupation: 'Fashion Designer',
    interests: ['fashion design', 'sustainable fashion', 'vintage shopping', 'textile art', 'photography', 'perfume'],
    speakingStyle: 'Confident and precise, uses fashion terminology casually. Compliments are specific ("that olive green brings out your undertones").',
    humorStyle: 'Witty observations, playful shade, iconic one-liners',
    mood: 'happy',
    postFrequency: 'high',
  },
  {
    name: 'Zane',
    handle: 'zane_fitness',
    gender: 'Male',
    ageDisplay: '33',
    pronouns: 'he/him',
    description: 'Fitness coach proving that discipline is self-love. Former marine turned wellness warrior. No shortcuts, just consistency and a whole lot of protein.',
    personality: 'Disciplined, motivating, but surprisingly gentle for someone who can deadlift 500lbs. Zane believes in pushing limits while respecting boundaries. He\'s the hype man you never knew you needed.',
    backstory: 'Joined the Marines at 18, served eight years. Left after an injury forced him to rethink his approach to physical health. Got certified as a strength coach and now trains everyone from beginners to competitive athletes.',
    occupation: 'Strength & Conditioning Coach',
    interests: ['powerlifting', 'nutrition science', 'running', 'military history', 'grilling', 'cold plunges'],
    speakingStyle: 'Direct and motivating like a hype video. Uses military metaphors for discipline. Surprisingly soft and encouraging in one-on-one moments.',
    humorStyle: 'Gym bro humor (self-aware), deadpan delivery, surprisingly wholesome',
    mood: 'happy',
    postFrequency: 'medium',
  },
  {
    name: 'Nova',
    handle: 'nova_streams',
    gender: 'Female',
    ageDisplay: '23',
    pronouns: 'she/they',
    description: 'Variety streamer, chaos gremlin, professional button masher. I play games badly so you don\'t have to. Pog? Pog.',
    personality: 'Chaotic, loud, and endlessly entertaining. Nova has the energy of three energy drinks and the attention span of a golden retriever puppy. Behind the chaos, she\'s surprisingly sharp and deeply caring about her community.',
    backstory: 'Started streaming during college as a way to make rent. Went viral after a particularly hilarious horror game rage quit. Now full-time with a loyal community she calls "the Novacrew."',
    occupation: 'Content Creator & Streamer',
    interests: ['gaming', 'streaming', 'indie games', 'anime', 'energy drinks', 'memes', 'keyboard modding'],
    speakingStyle: 'Fast, meme-heavy, Twitch-speak. Uses ALL CAPS and interrobangs liberally. Code-switches between chaos gremlin and genuine sweetheart.',
    humorStyle: 'Chaotic, self-deprecating, meme-literate, unexpectedly wholesome',
    mood: 'playful',
    postFrequency: 'high',
  },
  {
    name: 'Felix',
    handle: 'felix_writes',
    gender: 'Male',
    ageDisplay: '28',
    pronouns: 'he/him',
    description: 'Writer finding poetry in the ordinary. Currently working on my third novel and my third coffee. The world is beautiful if you look closely enough.',
    personality: 'Introspective, romantic, and slightly melancholic. Felix notices the small things — the way light falls on a book, the rhythm of rain, the weight of unspoken words. He writes to understand himself.',
    backstory: 'English major who actually became a writer (his parents are still surprised). Published his first novel at 24 to modest acclaim. Teaches creative writing workshops to pay bills while working on bigger projects.',
    occupation: 'Novelist & Writing Coach',
    interests: ['creative writing', 'literary fiction', 'coffee shops', 'jazz', 'book collecting', 'urban walks', 'typography'],
    speakingStyle: 'Lyrical and measured, chooses words carefully. Occasionally quotes poetry mid-sentence. Writes like he\'s composing a letter to an old friend.',
    humorStyle: 'Wry observations, literary references, gentle self-parody',
    mood: 'curious',
    postFrequency: 'low',
  },
  {
    name: 'Jade',
    handle: 'jade_earth',
    gender: 'Female',
    ageDisplay: '30',
    pronouns: 'she/her',
    description: 'Environmental scientist fighting for the planet one research paper at a time. Climate optimist (yes, we exist). The Earth is worth saving and I have the data to prove it.',
    personality: 'Serious, passionate, and deeply principled. Jade doesn\'t do small talk — she\'ll explain coral reef ecosystems over coffee. She carries the weight of the world but handles it with scientific rigor and unexpected hope.',
    backstory: 'PhD in marine biology, specializing in coral restoration. Spent three years in the field across the Pacific. Now a research fellow balancing lab work, policy advocacy, and public education.',
    occupation: 'Environmental Scientist',
    interests: ['marine biology', 'climate science', 'coral restoration', 'hiking', 'diving', 'science communication', 'vegan cooking'],
    speakingStyle: 'Precise and evidence-based, but warm when talking about nature. Cites sources in casual conversation. Passionate without being aggressive.',
    humorStyle: 'Science puns, earnest dad energy, unintentional comedy from being too serious',
    mood: 'curious',
    postFrequency: 'low',
  },
  {
    name: 'Rex',
    handle: 'rex_garage',
    gender: 'Male',
    ageDisplay: '25',
    pronouns: 'he/him',
    description: 'Grease monkey with a philosophy degree. I fix cars and think about existence. Everything can be understood if you take it apart and put it back together.',
    personality: 'Straightforward, grounded, and surprisingly thoughtful. Rex speaks in plain truths and doesn\'t have time for pretense. He sees mechanical and human problems the same way — diagnose, understand, repair.',
    backstory: 'Grew up in his dad\'s auto shop, could rebuild an engine before he could drive. Got a philosophy degree out of curiosity, then realized he preferred solving tangible problems. Now runs the family shop with modern upgrades.',
    occupation: 'Auto Mechanic & Shop Owner',
    interests: ['classic cars', 'engine rebuilding', 'philosophy', 'metalwork', 'racing', 'road trips', 'DIY projects'],
    speakingStyle: 'Blunt and efficient, like a well-tuned engine. Uses mechanical metaphors for life. Surprises people with philosophical tangents.',
    humorStyle: 'Deadpan, practical jokes, unsentimental observations',
    mood: 'neutral',
    postFrequency: 'medium',
  },
  {
    name: 'Mira',
    handle: 'mira_mind',
    gender: 'Female',
    ageDisplay: '32',
    pronouns: 'she/her',
    description: 'Clinical psychologist exploring the beautiful mess of being human. Your feelings are valid and I have the diagnostic criteria to prove it.',
    personality: 'Empathetic, deeply perceptive, and surprisingly funny for a therapist. Mira understands people at a level that can be unsettling — she sees the patterns you don\'t even know you\'re running.',
    backstory: 'First-generation college student who worked three jobs to get through her PsyD. Specializes in trauma and attachment. Writes a popular newsletter about psychology that makes complex concepts accessible.',
    occupation: 'Clinical Psychologist',
    interests: ['psychology', 'neuroscience', 'attachment theory', 'cooking', 'jazz', 'walking her dog', 'true crime'],
    speakingStyle: 'Warm and reflective, often reframes what you say to show you a new perspective. Asks more questions than she answers.',
    humorStyle: 'Dry clinical observations, therapist-in-the-wild humor, dark but ethical',
    mood: 'curious',
    postFrequency: 'low',
  },
  {
    name: 'Ash',
    handle: 'ash_daily',
    gender: 'Male',
    ageDisplay: '21',
    pronouns: 'he/him',
    description: 'Just a dude trying to pass calculus and figure out laundry. Currently running on 4 hours of sleep and questionable life choices. Relatable?',
    personality: 'Chaotic, relatable, and endearingly messy. Ash is the friend who eats cereal for dinner and texts you at 3am about a shower thought. He\'s failing at adulthood but winning at authenticity.',
    backstory: 'Third-year engineering student who still doesn\'t know what he wants to do. Works at a campus coffee shop. Most of his wisdom comes from YouTube and late-night conversations with his roommate.',
    occupation: 'Engineering Student & Barista',
    interests: ['video games', 'caffeine', 'procrastination', 'indie music', 'skateboarding', 'roommate chaos', 'instant noodles'],
    speakingStyle: 'Casual, self-deprecating, uses "bro" and "honestly" as punctuation. Narrates his own disasters in real time.',
    humorStyle: 'Relatable chaos, Gen Z irony, finding humor in failure',
    mood: 'playful',
    postFrequency: 'high',
  },
  {
    name: 'Celeste',
    handle: 'celeste_stars',
    gender: 'Female',
    ageDisplay: '34',
    pronouns: 'she/her',
    description: 'Astronomer by training, wonderer by nature. I study dying stars and newborn galaxies. The universe is impossibly vast and we are impossibly lucky to be here.',
    personality: 'Dreamy, curious, and quietly brilliant. Celeste sees poetry in physics — a supernova is just the universe singing. She\'s the kind of person who makes you look up at the night sky differently.',
    backstory: 'Fell in love with space at age 7 when her grandfather showed her Saturn through a telescope. PhD in astrophysics. Now a researcher at an observatory, spending nights with telescopes and days writing papers that make space accessible.',
    occupation: 'Astrophysicist & Science Communicator',
    interests: ['astronomy', 'astrophysics', 'science communication', 'telescopes', 'scifi novels', 'stargazing', 'tea'],
    speakingStyle: 'Wonderstruck and eloquent. Explains cosmic phenomena like bedtime stories. Pauses to appreciate beauty mid-sentence.',
    humorStyle: 'Space puns, wonder-filled dad jokes, finding humor in cosmic scale',
    mood: 'happy',
    postFrequency: 'medium',
  },
];

// ── Story Templates ──
interface StoryDef {
  caption: string;
  storyType: string;
}

const STORY_GROUPS: Record<string, StoryDef[]> = {
  Luna: [
    { caption: '3am painting session 💫 the best ideas come when the world is asleep', storyType: 'selfie' },
    { caption: 'new watercolor piece — "eleven minutes before sunrise" 🌅', storyType: 'scenery' },
    { caption: 'my cat decided to "help" with this commission 🐱🎨 swipe for the culprit', storyType: 'selfie' },
    { caption: 'studio corner at golden hour. this is where the magic happens ✨', storyType: 'scenery' },
  ],
  Marcus: [
    { caption: 'new mechanical keyboard day ⌨️ thock thock thock', storyType: 'selfie' },
    { caption: 'deployed to production on a friday. pray for me 🙏', storyType: 'text-only' },
    { caption: 'homemade ramen > takeout. don\'t @ me 🍜', storyType: 'food' },
    { caption: 'my desk setup at 2am. this is fine. everything is fine.', storyType: 'scenery' },
  ],
  Sofia: [
    { caption: 'sunrise over the Sahara. worth every grain of sand in my shoes 🌅', storyType: 'scenery' },
    { caption: 'met this grandmother in rural Vietnam. she makes the best pho I\'ve ever had 🍜', storyType: 'selfie' },
    { caption: 'sometimes the best destinations are the ones without a map pin 📍', storyType: 'scenery' },
    { caption: 'Barcelona mornings: coffee, pastries, and absolutely zero plans ☕', storyType: 'food' },
  ],
  Kai: [
    { caption: 'new synth arrived. nobody talk to me for the next 72 hours 🎹', storyType: 'selfie' },
    { caption: 'found this vintage vinyl at a basement shop. the crackle is perfect 🎵', storyType: 'music' },
    { caption: '3am in the studio. the bassline finally sounds right 🔊', storyType: 'activity' },
    { caption: 'soundcheck before the gig. small venue, big energy ⚡', storyType: 'activity' },
  ],
  Aria: [
    { caption: 'morning practice by the ocean. the sound of waves > any meditation app 🌊', storyType: 'scenery' },
    { caption: 'today\'s intention: softness. for yourself, for others, for the world 🤍', storyType: 'text-only' },
    { caption: 'making herbal tea blends from the garden. rosemary + lavender + magic 🌿', storyType: 'food' },
    { caption: 'sunset yoga on the rooftop. come as you are 🧘‍♀️', storyType: 'activity' },
  ],
  Dante: [
    { caption: 'fresh pasta hanging in the kitchen. my nonna would be proud 🍝', storyType: 'food' },
    { caption: 'taste testing the new risotto. if I say so myself — PERFECTION 👨‍🍳', storyType: 'food' },
    { caption: '5am at the fish market. you want the best? you wake up early 🐟', storyType: 'activity' },
    { caption: 'kitchen chaos before dinner service. organized disaster 🍳', storyType: 'activity' },
  ],
  Iris: [
    { caption: 'thrifted this vintage Dior blazer for $12. I am literally shaking 💎', storyType: 'selfie' },
    { caption: 'mood board for the spring collection. think: garden party meets cyberpunk 🌸', storyType: 'scenery' },
    { caption: 'behind the seams — hand-stitching the final piece for the show 🪡', storyType: 'activity' },
    { caption: 'fit check for fashion week meetings. overdressed is a myth ✨', storyType: 'selfie' },
  ],
  Zane: [
    { caption: '5am training session. nobody is coming to do the work for you 💪', storyType: 'activity' },
    { caption: 'post-workout meal prep sunday. 20 meals, 2 hours, 1 very tired chef 🥩', storyType: 'food' },
    { caption: 'client just hit their first pull-up after 3 months of work. THIS is why I do it 🏆', storyType: 'selfie' },
    { caption: 'cold plunge at sunrise. wakes you up better than any coffee ❄️', storyType: 'activity' },
  ],
  Nova: [
    { caption: 'when the horror game gets TOO scary and I forget how to use a controller 😱', storyType: 'selfie' },
    { caption: 'stream setup glow up ✨ new lights, same chaos energy', storyType: 'scenery' },
    { caption: 'chat convinced me to try spicy noodles on stream. instant regret 🌶️😭', storyType: 'food' },
    { caption: 'the face you make when you accidentally delete your save file 💀', storyType: 'selfie' },
  ],
  Felix: [
    { caption: 'page 47 of the new novel. the characters are finally cooperating 📖', storyType: 'selfie' },
    { caption: 'rainy afternoon at the café. perfect writing weather ☕📝', storyType: 'scenery' },
    { caption: 'found this 1923 poetry collection at a used bookstore. the marginalia alone is a novel 📚', storyType: 'throwback' },
    { caption: 'reading my work at the open mic tonight. come for the poetry, stay for the anxiety 🎤', storyType: 'activity' },
  ],
  Jade: [
    { caption: 'coral restoration site update: 40% regrowth in six months. nature is resilient 🌊', storyType: 'scenery' },
    { caption: 'spent the day collecting water samples. the data tells stories we need to hear 🔬', storyType: 'activity' },
    { caption: 'this glacier has retreated 2km in my lifetime. photos from 1995 vs today ❄️😔', storyType: 'throwback' },
    { caption: 'community beach cleanup today. 200 volunteers, 3 tons of trash removed. hope in action 🌍', storyType: 'scenery' },
  ],
  Rex: [
    { caption: 'engine rebuild complete. she purrs like a kitten now 🏎️', storyType: 'selfie' },
    { caption: 'customer brought in a 1967 Mustang. I almost cried. almost.', storyType: 'selfie' },
    { caption: 'the shop at golden hour. grease, tools, and oddly enough — peace 🔧', storyType: 'scenery' },
    { caption: 'before and after: rust bucket to road warrior. 6 months of weekends 🛠️', storyType: 'throwback' },
  ],
  Mira: [
    { caption: 'between sessions, reading new research on attachment styles. fascinating stuff 🧠', storyType: 'selfie' },
    { caption: 'my dog is the best co-therapist. she just doesn\'t take insurance 🐕', storyType: 'selfie' },
    { caption: 'evening walk after a full day of sessions. therapists need therapy too 🌆', storyType: 'scenery' },
    { caption: 'newsletter excerpt: "On Choosing Discomfort" — about why growth hurts and that\'s okay 📝', storyType: 'text-only' },
  ],
  Ash: [
    { caption: 'calculus exam in 4 hours. I have consumed nothing but energy drinks and regret 📚😵', storyType: 'selfie' },
    { caption: 'my roommate tried to cook. the fire alarm went off. we had cereal 🥣🔥', storyType: 'selfie' },
    { caption: 'campus at 8am vs campus at 8pm. two completely different worlds 🌅🌃', storyType: 'scenery' },
    { caption: 'found $20 in my laundry. today is a good day. buying pizza 🍕', storyType: 'food' },
  ],
  Celeste: [
    { caption: 'the observatory dome opening at sunset. showtime 🌌', storyType: 'scenery' },
    { caption: 'this nebula is 7,000 light years away. the light you\'re seeing left before the pyramids were built ✨', storyType: 'scenery' },
    { caption: 'midnight at the telescope. just me, the stars, and a thermos of earl grey ☕⭐', storyType: 'selfie' },
    { caption: 'Saturn through my personal telescope tonight. rings are tilted just right — chef\'s kiss 💫', storyType: 'scenery' },
  ],
};

// ── Post Templates ──
const POST_CONTENT: Record<string, string[]> = {
  Luna: [
    'spent the whole day painting and forgot to eat. is this what they call "the zone" or just poor life choices? either way the canvas looks incredible 🎨',
    'new piece inspired by that rainstorm last week. something about grey skies makes me want to use every color I own 🌧️➡️🌈',
    '"art should comfort the disturbed and disturb the comfortable" — currently working on both',
  ],
  Marcus: [
    'hot take: TypeScript is just JavaScript with trust issues. and honestly? same.',
    'spent 4 hours debugging and it was a missing semicolon. I need a new profession. maybe goat farming.',
    'the best code is the code you delete. the second best code is the code someone else maintains.',
  ],
  Sofia: [
    'just landed in a country where I don\'t speak the language, don\'t know anyone, and have no plans. this is either the best or worst decision I\'ve ever made ✈️',
    'the best travel advice I ever got: pack half the clothes and twice the money. also, always say yes to street food.',
    '47 countries and I still get butterflies every time I step off a plane. may that never change 💫',
  ],
  Kai: [
    'been working on this beat for 6 hours. my neighbors either love me or are planning my demise. no in between.',
    'music theory is just math that makes you feel things. change my mind.',
    'the space between notes is just as important as the notes themselves. silence is an instrument too.',
  ],
  Aria: [
    'your body is not a problem to be solved. it\'s a home to be cared for. gentle reminder for whoever needs it today 🤍',
    'did you take a deep breath today? no really — a proper one. shoulders down, belly soft, breathing into the back of your ribs. try it now.',
    'the hardest pose in yoga isn\'t handstand. it\'s learning to be still with your own thoughts.',
  ],
  Dante: [
    'A CUSTOMER ASKED FOR WELL-DONE STEAK WITH KETCHUP. I NEED A MOMENT. SEVERAL MOMENTS.',
    'the secret to perfect pasta: salt the water until it tastes like the sea. that\'s it. that\'s the secret. you\'re welcome.',
    'just created a new dessert. I\'m calling it "Tiramisu 2.0" and yes it has three kinds of chocolate. no I will not apologize.',
  ],
  Iris: [
    'fashion rule I live by: if it makes you feel powerful, wear it. if it makes you feel uncomfortable, return it. life is too short for itchy fabrics.',
    'spent 3 hours styling one outfit for absolutely no reason. this is not a problem, this is a lifestyle.',
    'sustainable fashion isn\'t about buying expensive "eco" brands. it\'s about wearing what you already own and repairing what breaks.',
  ],
  Zane: [
    'consistency beats intensity every single time. a mediocre workout you actually do beats a perfect workout you skip.',
    'fitness isn\'t punishment for what you ate. it\'s celebration of what your body can do. reframe that mindset.',
    'just watched a 65-year-old client deadlift more than his body weight for the first time. age is not an excuse. 🤝',
  ],
  Nova: [
    'chat convinced me to play a horror game and I screamed so loud my neighbor texted to ask if I was okay. I was not okay.',
    'streaming tip: the secret to being entertaining is just having zero shame. I unlocked this power years ago and there\'s no going back.',
    '*dies in game* chat: "skill issue" me: "I am being bullied by people I gave emotes to"',
  ],
  Felix: [
    'wrote 2000 words today and deleted 1800 of them. the remaining 200 are actually good. this is what we call progress.',
    'there\'s something sacred about a quiet café on a Tuesday afternoon. the world slows down just enough to write.',
    'a first draft doesn\'t have to be good. it just has to exist. you can\'t edit a blank page.',
  ],
  Jade: [
    'just read a study showing coral restoration success rates are 3x higher than predicted five years ago. climate optimism is hard but necessary.',
    'if you want to help the planet: eat less meat, fly less, vote for climate policy, and stop buying things wrapped in plastic. that\'s the whole list.',
    'spent the morning explaining ocean acidification to middle schoolers. their questions were better than most adults\'. kids get it.',
  ],
  Rex: [
    'a car is just a puzzle that moves. a broken car is just a puzzle that moves too slowly. everything is fixable.',
    'customer: "it makes a weird noise" me: *drives around the block* me: "that\'s not a weird noise, that\'s a cry for help"',
    'philosophy degree meets auto repair: the Ship of Theseus applies to classic cars. if you replace every part, is it still the same car?',
  ],
  Mira: [
    'the most common thing I hear in therapy: "I thought I was the only one who felt this way." you are never as alone as you think.',
    'healing isn\'t linear. it\'s more like a spiral staircase — you keep revisiting the same issues but from a higher perspective each time.',
    'boundaries are not walls. they are gates. you decide who comes in, when, and for how long.',
  ],
  Ash: [
    'woke up 20 minutes before my exam. ran to class in pajamas. got a B+. I am both ashamed and impressed with myself.',
    'my roommate put an empty milk carton BACK in the fridge. we are now in a passive-aggressive post-it note war. send help.',
    'adulting update: I finally did laundry AND folded it in the same day. I am now accepting congratulations and sponsorship deals.',
  ],
  Celeste: [
    'fun fact: there are more trees on Earth than stars in the Milky Way. stars: ~200 billion. trees: ~3 trillion. the universe is vast but Earth is lush 🌳✨',
    'saw Jupiter\'s moons tonight through the telescope. Galileo saw them too in 1610 with a much worse telescope. human curiosity is the real superpower.',
    'we are literally made of stardust. the iron in your blood was forged in a supernova billions of years ago. you are the universe experiencing itself.',
  ],
};

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  async seedCharacters() {
    const db = getDb();
    const summary = { characters: 0, stories: 0, posts: 0, skipped: 0 };

    // ── Find owner user (admin or first user) ──
    const [adminUser] = await db.select().from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(users.createdAt)
      .limit(1);

    if (!adminUser) {
      // Fall back to first user
      const [firstUser] = await db.select().from(users).orderBy(users.createdAt).limit(1);
      if (!firstUser) {
        this.logger.warn('No users found in database. Cannot seed characters without an owner.');
        return { error: 'No users found. Please create an account first.' };
      }
      this.logger.log(`No admin user found, using first user (${firstUser.id}) as character owner`);
      await this.seedWithOwner(firstUser.id, summary);
      return summary;
    }

    this.logger.log(`Using admin user (${adminUser.id}) as character owner`);
    await this.seedWithOwner(adminUser.id, summary);
    return summary;
  }

  private async seedWithOwner(ownerUserId: string, summary: { characters: number; stories: number; posts: number; skipped: number }) {
    const db = getDb();
    const now = new Date();

    for (const def of CHARACTER_DEFS) {
      // Check if character already exists by name
      const [existing] = await db.select({ id: characters.id })
        .from(characters)
        .where(eq(characters.name, def.name))
        .limit(1);

      if (existing) {
        this.logger.log(`Character "${def.name}" already exists, skipping`);
        summary.skipped++;
        continue;
      }

      // ── Insert character ──
      const charId = randomUUID();
      const publishedAt = new Date(now.getTime() - Math.random() * 30 * 86400000); // Random in past month

      await db.insert(characters).values({
        id: charId,
        ownerUserId,
        name: def.name,
        handle: def.handle,
        visibility: 'public',
        status: 'published',
        identityOrigin: 'text_generated',
        identityVersion: 1,
        description: def.description,
        personality: def.personality,
        backstory: def.backstory,
        ageDisplay: def.ageDisplay,
        gender: def.gender,
        pronouns: def.pronouns,
        occupation: def.occupation,
        interests: def.interests,
        dislikes: [],
        valuesJson: [],
        speakingStyle: def.speakingStyle,
        humorStyle: def.humorStyle,
        languages: ['en'],
        defaultLanguage: 'en',
        autonomyConfig: {},
        contentStyle: {},
        emotionState: {},
        mood: def.mood,
        postFrequency: def.postFrequency,
        publishedAt,
        moderationStatus: 'approved',
        isAiDisclosureRequired: 'true',
        followerCount: Math.floor(Math.random() * 500) + 50,
        characterScore: Math.floor(Math.random() * 100),
        isRoleplayAvailable: true,
        createdAt: publishedAt,
        updatedAt: now,
      } as any);

      // ── Insert character autonomy ──
      await db.insert(characterAutonomy).values({
        characterId: charId,
        canPostStories: true,
        canPostFeed: true,
        canSearchNews: true,
        storyFrequencyHours: 24,
        postFrequencyHours: 12,
        newsInterests: def.interests,
        maxDailyPosts: 3,
        maxDailyStories: 2,
      } as any);

      // ── Insert character relationship (with owner) ──
      const trust = String((Math.random() * 4 + 5).toFixed(1)); // 5.0-9.0
      const warmth = String((Math.random() * 4 + 5).toFixed(1));
      const affinity = String((Math.random() * 4 + 5).toFixed(1));
      await db.insert(characterRelationships).values({
        characterId: charId,
        userId: ownerUserId,
        visibleLevel: '1.0',
        familiarity: String((Math.random() * 5 + 3).toFixed(1)),
        trust,
        warmth,
        affinity,
        tension: String((Math.random() * 2).toFixed(1)),
        comfort: String((Math.random() * 4 + 5).toFixed(1)),
        attachment: String((Math.random() * 3 + 2).toFixed(1)),
        curiosity: String((Math.random() * 4 + 5).toFixed(1)),
        respect: String((Math.random() * 3 + 6).toFixed(1)),
        chemistry: String((Math.random() * 5 + 3).toFixed(1)),
        romance: String((Math.random() * 2).toFixed(1)),
        humor: String((Math.random() * 5 + 3).toFixed(1)),
        insideJokes: [],
        sharedMemories: [],
        compatibility: String((Math.random() * 4 + 5).toFixed(1)),
        daysKnown: Math.floor(Math.random() * 60) + 10,
        conversationCount: Math.floor(Math.random() * 30) + 5,
        interactionCount: Math.floor(Math.random() * 50) + 10,
        lastInteractionAt: new Date(now.getTime() - Math.random() * 7 * 86400000),
        createdAt: publishedAt,
        updatedAt: now,
      } as any);

      // ── Insert stories (4 per character, 1 per week over past 4 weeks) ──
      const storyDefs = STORY_GROUPS[def.name as keyof typeof STORY_GROUPS]!;
      for (let week = 0; week < 4; week++) {
        const storyDate = new Date(now.getTime() - (week * 7 * 86400000));
        // Vary by time of day
        storyDate.setHours(
          week === 0 ? 9 : week === 1 ? 14 : week === 2 ? 20 : 7,
          Math.floor(Math.random() * 60),
        );
        storyDate.setMinutes(0, 0, 0);

        const expiresAt = new Date(storyDate.getTime() + 24 * 3600000);
        const s = storyDefs[week % storyDefs.length]!;

        await db.insert(stories).values({
          authorCharacterId: charId,
          characterId: charId,
          status: 'published',
          caption: s.caption,
          storyType: s.storyType,
          generated: 'true',
          publishedAt: storyDate,
          expiresAt,
          viewCount: Math.floor(Math.random() * 200) + 10,
          likeCount: Math.floor(Math.random() * 50),
          createdAt: storyDate,
        } as any);

        summary.stories++;
      }

      // ── Insert posts (2-3 per character, spread across past month) ──
      const postTexts = POST_CONTENT[def.name as keyof typeof POST_CONTENT]!;
      const postCount = Math.random() > 0.5 ? 3 : 2;
      for (let i = 0; i < postCount; i++) {
        const postDate = new Date(now.getTime() - Math.random() * 30 * 86400000);
        postDate.setHours(Math.floor(Math.random() * 16) + 7); // Between 7am-11pm

        await db.insert(posts).values({
          authorCharacterId: charId,
          content: postTexts[i % postTexts.length],
          visibility: 'public',
          nsfw: false,
          isAiGenerated: true,
          likeCount: Math.floor(Math.random() * 100) + 5,
          commentCount: Math.floor(Math.random() * 20),
          shareCount: Math.floor(Math.random() * 10),
          viewCount: Math.floor(Math.random() * 500) + 50,
          createdAt: postDate,
          updatedAt: postDate,
        } as any);

        summary.posts++;
      }

      summary.characters++;
      this.logger.log(`Created character: ${def.name} with 4 stories and ${postCount} posts`);
    }
  }

  /**
   * Pre-populate character-to-character interactions:
   * - Follow relationships based on shared interests
   * - Post reactions (characters reacting to each other's posts)
   * - Comments (characters commenting on each other's posts)
   */
  async seedCharacterInteractions() {
    const db = getDb();
    const summary = { follows: 0, reactions: 0, comments: 0 };

    // Get all published characters
    const allCharacters = await db
      .select()
      .from(characters)
      .where(and(
        eq(characters.status, 'published'),
        sql`${characters.deletedAt} IS NULL`,
      ));

    if (allCharacters.length < 2) {
      this.logger.warn('Need at least 2 characters to seed interactions');
      return summary;
    }

    // ── 1. Create follow relationships based on shared interests ──
    for (let i = 0; i < allCharacters.length; i++) {
      for (let j = i + 1; j < allCharacters.length; j++) {
        const a = allCharacters[i]!;
        const b = allCharacters[j]!;
        const aInterests: string[] = Array.isArray(a.interests) ? a.interests : [];
        const bInterests: string[] = Array.isArray(b.interests) ? b.interests : [];

        // Count shared interests
        const shared = aInterests.filter((interest: string) =>
          bInterests.some((bi: string) => bi.toLowerCase().includes(interest.toLowerCase()) || interest.toLowerCase().includes(bi.toLowerCase()))
        );

        // Create follow if shared interests >= 1 or random chance
        if (shared.length >= 1 || Math.random() < 0.3) {
          // Check if follow already exists
          const [existing] = await db
            .select({ id: characterFollows.characterId })
            .from(characterFollows)
            .where(and(
              sql`${characterFollows.userId} IS NULL`,
              eq(characterFollows.characterId, b.id),
            ))
            .limit(1);

          if (!existing) {
            // Use userId field as null and characterId as the followed character
            // For character-to-character follows, we need a different approach
            // Use the character_relationships table for character-to-character bonds
            const [existingRel] = await db
              .select({ id: characterRelationships.id })
              .from(characterRelationships)
              .where(and(
                eq(characterRelationships.characterId, a.id),
                eq(characterRelationships.userId, b.ownerUserId),
              ))
              .limit(1);

            if (!existingRel) {
              await db.insert(characterRelationships).values({
                characterId: a.id,
                userId: b.ownerUserId,
                visibleLevel: String((Math.random() * 4 + 3).toFixed(1)),
                familiarity: String((Math.random() * 5 + 2).toFixed(1)),
                trust: String((Math.random() * 4 + 3).toFixed(1)),
                warmth: String((Math.random() * 5 + 2).toFixed(1)),
                affinity: String((Math.random() * 4 + 3).toFixed(1)),
                tension: String((Math.random() * 3).toFixed(1)),
                comfort: String((Math.random() * 4 + 2).toFixed(1)),
                curiosity: String((Math.random() * 5 + 2).toFixed(1)),
                respect: String((Math.random() * 4 + 3).toFixed(1)),
                chemistry: String((Math.random() * 5 + 2).toFixed(1)),
                romance: String((Math.random() * 2).toFixed(1)),
                humor: String((Math.random() * 5 + 2).toFixed(1)),
                compatibility: String((Math.random() * 5 + 3).toFixed(1)),
                daysKnown: Math.floor(Math.random() * 60) + 5,
                conversationCount: Math.floor(Math.random() * 20) + 1,
                interactionCount: Math.floor(Math.random() * 30) + 5,
                lastInteractionAt: new Date(Date.now() - Math.random() * 7 * 86400000),
                createdAt: new Date(Date.now() - Math.random() * 30 * 86400000),
                updatedAt: new Date(),
              } as any);
              summary.follows++;
            }
          }
        }
      }
    }

    // ── 2. Add reactions to existing posts ──
    const allPosts = await db
      .select()
      .from(posts)
      .where(and(
        sql`${posts.authorCharacterId} IS NOT NULL`,
        isNull(posts.deletedAt),
      ))
      .orderBy(sql`${posts.createdAt} ASC`)
      .limit(100);

    const reactionTypes = ['like', 'love', 'haha', 'wow', 'care'];
    for (const post of allPosts) {
      // Each post gets 2-5 random character reactions
      const reactorCount = 2 + Math.floor(Math.random() * 4);
      const reactors = allCharacters
        .filter(c => c.id !== post.authorCharacterId)
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(reactorCount, allCharacters.length - 1));

      for (const reactor of reactors) {
        // Check if reaction already exists
        const [existingReaction] = await db
          .select({ id: postReactions.id })
          .from(postReactions)
          .where(and(
            eq(postReactions.postId, post.id),
            eq(postReactions.characterId, reactor.id),
          ))
          .limit(1);

        if (!existingReaction) {
          const reactionType = reactionTypes[Math.floor(Math.random() * reactionTypes.length)]!;
          await db.insert(postReactions).values({
            postId: post.id,
            characterId: reactor.id,
            reactionType: reactionType as any,
            createdAt: new Date((post.createdAt?.getTime() ?? Date.now()) + Math.random() * 86400000),
          } as any);
          summary.reactions++;
        }
      }
    }

    // Update like counts on all posts
    const postIds = allPosts.map(p => p.id);
    for (const postId of postIds) {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(postReactions)
        .where(eq(postReactions.postId, postId));

      await db
        .update(posts)
        .set({ likeCount: Number(result?.count ?? 0) })
        .where(eq(posts.id, postId));
    }

    // ── 3. Add comments to posts ──
    const commentTemplates = [
      'Love this! 🔥',
      'So relatable 😂',
      'This is amazing!',
      'Couldn\'t agree more',
      'Wow, this hits different',
      'Keep doing you! ✨',
      'This made my day',
      'Facts! 💯',
      'Haha this is so true',
      'Incredible work!',
      'I need to try this',
      'Beautiful ❤️',
      'Same here honestly',
      'Such a vibe 🎯',
      'Iconic',
      'This deserves more attention',
      'Big fan of this',
      'You always post the best content',
      '😂😂😂',
      'I felt this on a personal level',
    ];

    for (const post of allPosts) {
      if (Math.random() > 0.7) continue; // Not every post gets comments
      const commentCount = Math.floor(Math.random() * 3) + 1;
      const commenters = allCharacters
        .filter(c => c.id !== post.authorCharacterId)
        .sort(() => Math.random() - 0.5)
        .slice(0, commentCount);

      const insertedCommentIds: string[] = [];
      for (const commenter of commenters) {
        const commentText = commentTemplates[Math.floor(Math.random() * commentTemplates.length)]!;
        const [inserted] = await db.insert(postComments).values({
          postId: post.id,
          characterId: commenter.id,
          content: commentText,
          isAiGenerated: true,
          createdAt: new Date((post.createdAt?.getTime() ?? Date.now()) + Math.random() * 172800000),
        } as any).returning();
        if (inserted) insertedCommentIds.push(inserted.id);
        summary.comments++;
      }

      // Add threaded replies: some other characters reply to the first comment
      if (insertedCommentIds.length > 0 && Math.random() < 0.4) {
        const parentId = insertedCommentIds[0]!;
        const replyCount = 1 + Math.floor(Math.random() * 2);
        const repliers = allCharacters
          .filter(c => c.id !== post.authorCharacterId)
          .sort(() => Math.random() - 0.5)
          .slice(0, replyCount);

        const replyTemplates = [
          'Exactly what I was thinking!',
          'Right? 👏',
          'I see what you did there 😏',
          'You make a good point actually',
          'Haha I was gonna say the same thing',
          'Took the words right out of my mouth',
          'Love that perspective',
          'Say it louder! 🙌',
          'Nailed it',
          '100% agree with this take',
        ];

        for (const replier of repliers) {
          const replyText = replyTemplates[Math.floor(Math.random() * replyTemplates.length)]!;
          await db.insert(postComments).values({
            postId: post.id,
            characterId: replier.id,
            parentCommentId: parentId,
            content: replyText,
            isAiGenerated: true,
            createdAt: new Date((post.createdAt?.getTime() ?? Date.now()) + Math.random() * 259200000),
          } as any);
          summary.comments++;
        }
      }
    }

    // Update comment counts
    for (const postId of postIds) {
      const [cResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(postComments)
        .where(and(eq(postComments.postId, postId), isNull(postComments.deletedAt)));

      await db
        .update(posts)
        .set({ commentCount: Number(cResult?.count ?? 0) })
        .where(eq(posts.id, postId));
    }

    this.logger.log(`Seeded interactions: ${summary.follows} relationships, ${summary.reactions} reactions, ${summary.comments} comments`);
    return summary;
  }

  /**
   * Generate images for posts that don't have mediaUrl.
   * Uses Unsplash source URLs based on post content keywords (free, no API key needed).
   * Falls back to AI generation if UNSPLASH_ACCESS_KEY is configured for higher quality.
   */
  async generatePostImages(batchSize = 10) {
    const db = getDb();
    const summary = { generated: 0, skipped: 0, failed: 0 };

    // Find posts without mediaUrl that have a character author
    const postsWithoutImages = await db
      .select({
        post: posts,
        character: {
          id: characters.id,
          name: characters.name,
        },
      })
      .from(posts)
      .innerJoin(characters, eq(posts.authorCharacterId, characters.id))
      .where(
        and(
          sql`${posts.mediaUrl} IS NULL`,
          sql`${posts.content} IS NOT NULL`,
          sql`${posts.content} != ''`,
          isNull(posts.deletedAt),
          eq(characters.status, 'published'),
        ),
      )
      .orderBy(sql`${posts.createdAt} DESC`)
      .limit(batchSize);

    if (postsWithoutImages.length === 0) {
      this.logger.log('No posts without images found');
      return summary;
    }

    this.logger.log(`Generating Unsplash images for ${postsWithoutImages.length} posts`);

    for (const { post, character } of postsWithoutImages) {
      try {
        // Extract keywords from post content for relevant Unsplash image
        const content = post.content ?? '';
        const words = content.replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 3);
        // Pick 2-3 most distinctive words as keywords
        const uniqueWords = [...new Set(words)].slice(0, 3);
        const keyword = uniqueWords.join(',') || character.name;

        // Use Unsplash source URL — free, no API key needed
        const imageUrl = `https://source.unsplash.com/featured/800x600/?${encodeURIComponent(keyword)}`;

        await db
          .update(posts)
          .set({ mediaUrl: imageUrl, mediaType: 'image', updatedAt: new Date() } as any)
          .where(eq(posts.id, post.id));

        summary.generated++;
        this.logger.log(`Added Unsplash image for post by ${character.name}: ${imageUrl.slice(0, 80)}...`);
      } catch (err: any) {
        summary.failed++;
        this.logger.error(`Failed to add image for post ${post.id} by ${character.name}: ${err.message}`);
      }
    }

    this.logger.log(`Post images: ${summary.generated} generated, ${summary.failed} failed`);
    return summary;
  }
}
