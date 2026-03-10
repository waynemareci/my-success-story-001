# Strategy Facilitator

An AI-powered goal achievement platform that helps users discover their true goals through deep conversation, commit to actionable steps, and adaptively track progress with compassionate accountability.

## Current Status: Phase 0.1 (Throwaway Prototype)

This is a **disposable prototype** deployed on Vercel to gather feedback from testers. The goal is to validate whether the AI-driven goal discovery conversation is useful before building the full MVP.

🔗 **Live Demo**: [Add your Vercel URL here]

## Features (v0.1)

- **Anonymous Sessions**: No login required — UUID-based session tracking
- **AI Goal Discovery**: Multi-turn conversation powered by Claude API
- **Conversation Logging**: Full transcript storage in Supabase
- **Admin Transcript Viewer**: Developer tool to review user conversations
- **Mobile-Responsive**: PWA-ready with viewport optimizations for iOS

## Tech Stack

- **Frontend**: React (via CDN, no build tools)
- **Backend**: Express.js + Node.js
- **Database**: Supabase (PostgreSQL)
- **LLM**: Anthropic Claude API
- **Hosting**: Vercel

## Local Development

### Prerequisites

- Node.js 18+
- Supabase account
- Anthropic API key

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/strategy-facilitator.git
cd strategy-facilitator
```

2. Install dependencies:
```bash
cd prototype
npm install
```

3. Create `.env` file in `prototype/` directory:
```bash
cp .env.example .env
```

4. Add your API keys to `.env`:
```
ANTHROPIC_API_KEY=your_key_here
SUPABASE_URL=your_url_here
SUPABASE_ANON_KEY=your_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open http://localhost:3000

## Project Structure

```
Strategy Facilitator/
├── .amazonq/rules/          # Amazon Q context files
├── prototype/               # Phase 0 throwaway code
│   ├── server.js           # Express server
│   ├── index.html          # Chat UI
│   ├── admin.html          # Transcript viewer
│   └── .env.example        # Environment template
├── prompts/                # System prompt files
│   ├── system-prompt-v1.txt
│   └── welcome.txt
├── notes/                  # Research and design decisions
└── vercel.json            # Vercel deployment config
```

## Roadmap

- **Phase 0.1** (Current): Gather tester feedback on prototype
- **Phase 1** (Months 1–3): Full MVP with task generation and check-in system
- **Phase 2**: User accounts, mobile app, B2B features

See [development-status.md](.amazonq/rules/development-status.md) for detailed progress.

## Contributing

This is currently a solo project in early prototype phase. Not accepting contributions yet, but feedback is welcome!

## License

Proprietary — All rights reserved
