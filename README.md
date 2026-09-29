# Fabulari

Fabulari is my role-based community chat application for the 3813ICT Full Stack
Development assignment at Griffith University.

The assignment has two phases:

- Phase 1 contains the Angular interface, a small Express backend and JSON file
  persistence.
- Phase 2 adds MongoDB and Socket.IO real-time chat to complete the MEAN
  application.

## Running the application

```text
cd server
npm install
cd ../client
npm install
```

With MongoDB running, fill the development database once from the demonstration
data in `server/data/fabulari.json`:

```text
cd server
npm run seed
```

Run the two parts in separate terminals from the repository root:

```text
cd server
npm run dev
```

```text
cd client
ng serve
```

Open `http://localhost:4200`. The seed command replaces the data in the
development `fabulari` database, so do not run it again if you want to keep
changes made through the application. The server creates its MongoDB indexes
when it starts.
