# Deployment configuration

## Vercel frontend

Set `VITE_API_URL` in the Vercel project to the public Render service origin, for example `https://your-api.onrender.com` (no trailing slash). Do not use `SERVER_URL`; Vite only exposes variables with the `VITE_` prefix to browser code.

If the Vercel project root is the repository root, `vercel.json` builds `client` and serves its `dist` output. If the Vercel project root is `client`, the client-level `vercel.json` keeps React Router routes working on refresh.

## Render backend

Use `server` as the Render service root directory, `npm install` as the build command, and `npm start` as the start command. Configure these in Render's environment settings:

- `NODE_ENV=production`
- `PORT` is assigned by Render; the server reads it automatically.
- `MONGODB_URI` points to a persistent MongoDB Atlas database that permits the Render service to connect.
- `JWT_SECRET` is a long random secret unique to production.
- `CLIENT_URL` is the exact Vercel origin, such as `https://your-app.vercel.app`.
- `CLIENT_URLS` can optionally contain a comma-separated list of additional exact frontend origins, such as a custom domain and approved preview domains.
- `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` enable code and resume AI features.
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_CALLBACK_URL` enable GitHub OAuth. The callback URL must exactly match the GitHub OAuth app configuration; for this app it ends in `/app/integrations` on the Vercel origin.
- `BREVO_API_KEY`, `SENDER_EMAIL`, and `SENDER_NAME` enable verification email. Register and verify the sender address in Brevo first.

After deployment, check `https://your-api.onrender.com/api/health`. It should return JSON with `success: true` and `status: "ok"`. Then open the Vercel app, refresh a nested route such as `/app/insights`, and try signup, email verification, login, and GitHub connection.
