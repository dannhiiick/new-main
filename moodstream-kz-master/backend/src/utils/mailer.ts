import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend == null) {
    const key = process.env["RESEND_API_KEY"];
    if (!key) throw new Error("RESEND_API_KEY env variable is not set");
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM = process.env["EMAIL_FROM"] ?? "MoodStream <noreply@moodstream.kz>";
const APP_URL = process.env["APP_URL"] ?? "http://localhost:3000";

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Сброс пароля MoodStream",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f0f13;padding:32px;border-radius:16px">
        <h2 style="color:#c87b4e;margin:0 0 16px">MoodStream</h2>
        <p style="color:#f5f5f7;margin:0 0 24px">Вы запросили сброс пароля. Скопируйте код ниже и вставьте его в приложение.</p>
        <div style="background:#1c1c24;border:1px solid #2a2a35;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px">
          <p style="color:#888;font-size:12px;margin:0 0 8px">Код сброса пароля</p>
          <code style="font-size:13px;color:#c87b4e;word-break:break-all;letter-spacing:1px">${token}</code>
        </div>
        <p style="color:#888;font-size:12px;margin:0">Код действителен 1 час. Если вы не запрашивали сброс — проигнорируйте это письмо.</p>
      </div>
    `,
  });
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `${code} — ваш код MoodStream`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#22c55e">MoodStream</h2>
        <p>Ваш код подтверждения:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;
                    color:#22c55e;padding:16px 0">${code}</div>
        <p style="color:#888;font-size:12px">Код действителен 10 минут.</p>
      </div>
    `,
  });
}
