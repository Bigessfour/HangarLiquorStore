**Subject:** Quick preview – Hangar Liquor inventory (RuralStock)

Chris,

Here’s a plain-language outline of the inventory tool we’ve been building for Hangar. No fluff — what it is, what it does, how it works, and how it’s meant to put more money in your pocket.

### 1. What is it?
A mobile-first inventory app for a rural liquor store like yours.
It runs on your phone or tablet as a Progressive Web App (installs like a normal app). Scans and stock updates can queue when the signal is spotty and sync when you’re back online; live reports need a connection.

### 2. What does it do?
- Scan bottles with the phone camera (UPC) and update inventory
- Show current stock, top movers, and low-stock items
- Factor in local events and holidays you add (Hay Days, hunting weekend, etc.)
- On **Profit & Ops**: ranked recommendations — what to order, hold, or promote — with **estimated** dollar impact (cash tied up vs margin protected)
- Ask simple questions in everyday language (“Why is beer cash tied up?” / “What should I stock for Hay Days?”) and get answers grounded only in Hangar’s numbers in the app

**Honest dependencies (so we don’t oversell):**
- **Live register dollars** need Square connected (Owner OAuth) + a sync. Until then, Profit & Ops in the laptop demo is a **simulation** — a representation of what you’d see with the live Square data API, using sample numbers.
- Margin / “Saved” / “Made” stay estimates until we map your real costs from Square catalog (or your cost sheet).
- Offline: scans can queue; full dashboards still need a connection when you’re looking at live reports.

### 3. How does it do it?
- You scan inventory (and connect Square when you’re ready for live sales)
- The system calculates days-of-cover, overstock, and stock-out risk from counts, recent velocity, and event multipliers
- A lightweight engine runs first — works with limited data; no fancy cloud model required for the first walkthrough
- Later, with enough clean sales history, we can turn on SageMaker Canvas for higher-accuracy demand — optional improvement only
- Designed for Wiley connectivity: optimistic updates, offline scan queue, sync when the signal returns

### 4. How it makes you more money (the important part)
- Flags cash sitting in slow or dead stock (especially high-cost spirits that aren’t turning) — as **estimates** until we have your true costs
- Flags items likely to stock out before a busy weekend or event
- Flags over-ordering that would tie up money
- Gives a short ranked list of actions with estimated dollar impact instead of a wall of charts
- Lets you ask “why” and get an answer that points at the numbers in your store

In short: clearer decisions when you’re ordering — less guesswork about what’s trapped on the shelf vs what to protect for the weekend.

This is a **working preview / demo**. The walkthrough can show the Square-connected Profit screen as a simulation so you see the shape of the product; plugging in Hangar’s real Square account is what turns sample $ into your register.

Let me know what questions you have or if you want a live walkthrough.

Steve
