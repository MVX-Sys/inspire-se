const SENHAS_COMUNS = [
  "123456", "1234567", "12345678", "123456789", "1234567890", "12345",
  "senha", "senha123", "password", "password1", "passw0rd", "qwerty",
  "qwerty123", "abc123", "111111", "000000", "iloveyou", "admin",
  "admin123", "brasil", "flamengo", "corinthians", "teste", "teste123",
  "letmein", "welcome", "monkey", "sunshine", "princess", "dragon",
];

export type PasswordCheck = {
  ok: boolean;
  errors: string[];
  score: number; // 0-4
};

function temSequencia(s: string) {
  const low = s.toLowerCase();
  for (let i = 0; i + 3 < low.length + 1; i++) {
    const trecho = low.slice(i, i + 4);
    if (trecho.length < 4) break;
    let cresc = true;
    let decr = true;
    for (let j = 1; j < trecho.length; j++) {
      const diff = trecho.charCodeAt(j) - trecho.charCodeAt(j - 1);
      if (diff !== 1) cresc = false;
      if (diff !== -1) decr = false;
    }
    if (cresc || decr) return true;
  }
  return false;
}

function temRepeticao(s: string) {
  return /(.)\1{3,}/.test(s);
}

export function validarSenha(
  senha: string,
  opts: { email?: string; telefone?: string } = {},
): PasswordCheck {
  const errors: string[] = [];
  const low = senha.toLowerCase();

  if (senha.length < 8) errors.push("Use pelo menos 8 caracteres.");
  if (!/[a-z]/.test(senha)) errors.push("Inclua ao menos uma letra minúscula.");
  if (!/[A-Z]/.test(senha)) errors.push("Inclua ao menos uma letra maiúscula.");
  if (!/[0-9]/.test(senha)) errors.push("Inclua ao menos um número.");
  if (!/[^A-Za-z0-9]/.test(senha))
    errors.push("Inclua ao menos um símbolo (ex: ! @ # $ %).");
  if (/\s/.test(senha)) errors.push("A senha não pode conter espaços.");

  if (SENHAS_COMUNS.some((c) => low === c || low.includes(c)))
    errors.push("Essa senha é muito comum e fácil de adivinhar.");

  if (temSequencia(senha))
    errors.push("Evite sequências óbvias (ex: 1234, abcd).");

  if (temRepeticao(senha))
    errors.push("Evite repetir o mesmo caractere várias vezes.");

  const emailLocal = (opts.email || "").split("@")[0]?.toLowerCase() ?? "";
  if (emailLocal.length >= 3 && low.includes(emailLocal))
    errors.push("A senha não pode conter partes do seu e-mail.");

  const telDigitos = (opts.telefone || "").replace(/\D/g, "");
  if (telDigitos.length >= 4) {
    const senhaDigitos = senha.replace(/\D/g, "");
    if (senhaDigitos.length >= 4 && telDigitos.includes(senhaDigitos))
      errors.push("A senha não pode conter partes do seu telefone.");
  }

  let score = 0;
  if (senha.length >= 8) score++;
  if (senha.length >= 12) score++;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) score++;
  if (/[0-9]/.test(senha) && /[^A-Za-z0-9]/.test(senha)) score++;
  if (errors.length > 0) score = Math.min(score, 2);

  return { ok: errors.length === 0, errors, score };
}

export function formatarTelefone(valor: string) {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
