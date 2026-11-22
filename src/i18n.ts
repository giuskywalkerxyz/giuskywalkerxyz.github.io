// Minimal i18n: English at the root, Brazilian Portuguese under /pt-br/.
export type Lang = 'en' | 'pt';
export const LANGS: Lang[] = ['en', 'pt'];
export const PT_PREFIX = '/pt-br';

/** Localized path for an internal route ('/pentest/' → '/pt-br/pentest/'). Hashes kept. */
export const lp = (lang: Lang, p: string) => (lang === 'pt' ? `${PT_PREFIX}${p === '/' ? '/' : p}` : p);

/** Same page in the other language, from the current pathname. */
export function altPath(pathname: string): { lang: Lang; href: string } {
  if (pathname === PT_PREFIX || pathname.startsWith(`${PT_PREFIX}/`)) {
    const rest = pathname.slice(PT_PREFIX.length) || '/';
    return { lang: 'en', href: rest };
  }
  return { lang: 'pt', href: `${PT_PREFIX}${pathname}` };
}

export const langOf = (pathname: string): Lang =>
  pathname === PT_PREFIX || pathname.startsWith(`${PT_PREFIX}/`) ? 'pt' : 'en';

const PT_MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const fmtDate = (d: Date, lang: Lang = 'en') =>
  lang === 'pt'
    ? `${d.getUTCDate()} ${PT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

export const fmtMonth = (d: Date | undefined, lang: Lang = 'en') =>
  d ? d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { year: 'numeric', month: 'short', timeZone: 'UTC' }) : undefined;

const dict = {
  en: {
    'meta.title': 'Giulliano Amaral — Offensive Security',
    'meta.description':
      'Giulliano Amaral — penetration tester and offensive security researcher. Web, API, Active Directory and AI/LLM security assessments, plus writeups and research.',
    'brand.tag': 'offensive security',
    'nav.services': 'services',
    'nav.writeups': 'writeups',
    'nav.ai': 'ai security',
    'nav.articles': 'articles',
    'nav.certs': 'certs',
    'nav.about': 'about',
    'nav.menu': 'menu',
    'nav.close': 'close',
    'nav.main': 'Main',
    'skip': 'Skip to content',
    'cta.scope': 'Scope a pentest',
    'cta.book': 'Book a call',
    'cta.email': 'E-mail',
    'cta.kicker': './contact --scope yours',
    'cta.h': 'Have something <em>in scope?</em>',
    'cta.p': "Tell me about the target, the environment and your timeline. I'll come back with questions and a proposed approach. Testing only starts with written authorization.",
    'footer.about': 'Penetration testing and offensive security research. Rio de Janeiro, Brazil, working remotely worldwide.',
    'footer.work': 'Work',
    'footer.elsewhere': 'Elsewhere',
    'footer.services': 'Services',
    'footer.aboutLink': 'About',
    'footer.legal': '// authorized testing only — written scope, every time',
    'lang.switch': 'Português',
    'lang.switchLabel': 'Ler em português',
    'back.writeups': '← All writeups',
    'back.articles': '← All articles',
    'back.ai': '← All AI writeups',
    'back.cves': '← All disclosures',
    'en.only': '',
    'mail.inquiry': 'Engagement inquiry',
    'mail.call': 'Call request',
    'mail.callBody': 'Hi Giulliano,\n\nI would like to book a 30-minute call to discuss a security assessment.\n\nCompany:\nPreferred dates/times (with timezone):\nTopic:\n',
  },
  pt: {
    'meta.title': 'Giulliano Amaral — Segurança Ofensiva',
    'meta.description':
      'Giulliano Amaral — pentester e pesquisador de segurança ofensiva. Testes de intrusão em aplicações web, APIs, Active Directory e sistemas de IA/LLM, além de writeups e pesquisa.',
    'brand.tag': 'segurança ofensiva',
    'nav.services': 'serviços',
    'nav.writeups': 'writeups',
    'nav.ai': 'segurança de IA',
    'nav.articles': 'artigos',
    'nav.certs': 'certificações',
    'nav.about': 'sobre',
    'nav.menu': 'menu',
    'nav.close': 'fechar',
    'nav.main': 'Principal',
    'skip': 'Pular para o conteúdo',
    'cta.scope': 'Orçar um pentest',
    'cta.book': 'Agendar conversa',
    'cta.email': 'E-mail',
    'cta.kicker': './contato --escopo seu',
    'cta.h': 'Tem algo <em>no escopo?</em>',
    'cta.p': 'Me conte sobre o alvo, o ambiente e o prazo. Eu volto com perguntas e uma proposta de abordagem. Os testes só começam com autorização por escrito.',
    'footer.about': 'Testes de intrusão e pesquisa em segurança ofensiva. Rio de Janeiro, Brasil, atendendo remotamente.',
    'footer.work': 'Trabalho',
    'footer.elsewhere': 'Redes',
    'footer.services': 'Serviços',
    'footer.aboutLink': 'Sobre',
    'footer.legal': '// só testes autorizados — escopo por escrito, sempre',
    'lang.switch': 'English',
    'lang.switchLabel': 'Read in English',
    'back.writeups': '← Todos os writeups',
    'back.articles': '← Todos os artigos',
    'back.ai': '← Todos os writeups de IA',
    'back.cves': '← Todas as divulgações',
    'en.only': 'Este conteúdo técnico está disponível apenas em inglês.',
    'mail.inquiry': 'Contato sobre projeto',
    'mail.call': 'Pedido de conversa',
    'mail.callBody': 'Olá, Giulliano,\n\nGostaria de agendar uma conversa de 30 minutos sobre um teste de segurança.\n\nEmpresa:\nDatas/horários preferidos:\nAssunto:\n',
  },
} as const;

export type Key = keyof (typeof dict)['en'];
export const useT = (lang: Lang) => (k: Key): string => dict[lang][k] ?? dict.en[k];
