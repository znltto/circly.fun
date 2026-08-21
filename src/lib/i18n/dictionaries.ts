import type { Locale } from "./config";

/**
 * Chaves de tradução organizadas por área.
 * Toda string nova visível na UI que quiser suportar troca de idioma
 * deve entrar aqui. Chaves ausentes caem no pt-BR (fallback).
 */
export type Dictionary = {
  common: {
    save: string;
    saving: string;
    saved: string;
    cancel: string;
    confirm: string;
    delete: string;
    edit: string;
    loading: string;
    back: string;
    close: string;
    open: string;
    yes: string;
    no: string;
    optional: string;
    required: string;
  };
  nav: {
    home: string;
    people: string;
    messages: string;
    dmsShort: string;
    newRoom: string;
    newShort: string;
    account: string;
    admin: string;
    sidebar: string;
    main: string;
    signOut: string;
    terms: string;
    privacy: string;
    scheduled: string;
    invitations: string;
  };
  home: {
    greetingMorning: string;
    greetingAfternoon: string;
    greetingEvening: string;
    fallbackName: string;
    heading: string;
    newRoomCta: string;
    joinWithLink: string;
    joinDisabledHint: string;
    friendRequestsOne: string;
    friendRequestsMany: string;
    friendRequestsSee: string;
    yourFriends: string;
    seeAll: string;
    emptyFriendsTitle: string;
    emptyFriendsDescription: string;
    emptyFriendsAction: string;
  };
  account: {
    pageTitle: string;
    pageSubtitle: string;
    profileHeading: string;
    accountHeading: string;
    email: string;
    memberSince: string;
    displayName: string;
    displayNameHint: string;
    username: string;
    usernameHint: string;
    status: string;
    statusHint: string;
    statusPlaceholder: string;
    changeAvatar: string;
    avatarHint: string;
    uploadImageError: string;
    networkError: string;
    saveChanges: string;
    savedOk: string;
    profileNotFound: string;
    languageHeading: string;
    languageDescription: string;
    languageLabel: string;
  };
  landing: {
    signIn: string;
    createRoom: string;
    newRoom: string;
    tagline: string;
    hero1: string;
    hero2: string;
    heroEmphasis: string;
    description: string;
    createOne: string;
    joinLink: string;
    urlHint: string;
    feature1Title: string;
    feature1Body: string;
    feature2Title: string;
    feature2Body: string;
    feature3Title: string;
    feature3Body: string;
    footerBio: string;
    footerStatus: string;
    footerProduct: string;
    footerCircly: string;
    footerContact: string;
    footerCredit: string;
  };
  languageSwitcher: {
    ariaLabel: string;
    heading: string;
  };
  install: {
    ctaShort: string;
    ctaLong: string;
    ariaLabel: string;
    dismiss: string;
    iosTitle: string;
    iosStep1: string;
    iosStep2: string;
    iosStep3: string;
    iosClose: string;
    alreadyInstalled: string;
  };
  help: {
    openLabel: string;
    closeLabel: string;
    title: string;
    subtitle: string;
    welcome: string;
    placeholder: string;
    sendLabel: string;
    disclaimer: string;
    unavailable: string;
    networkError: string;
  };
};

const pt: Dictionary = {
  common: {
    save: "Salvar",
    saving: "Salvando…",
    saved: "Salvo",
    cancel: "Cancelar",
    confirm: "Confirmar",
    delete: "Excluir",
    edit: "Editar",
    loading: "Carregando…",
    back: "Voltar",
    close: "Fechar",
    open: "Abrir",
    yes: "Sim",
    no: "Não",
    optional: "opcional",
    required: "obrigatório",
  },
  nav: {
    home: "Início",
    people: "Pessoas",
    messages: "Mensagens",
    dmsShort: "DMs",
    newRoom: "Nova sala",
    newShort: "Nova",
    account: "Conta",
    admin: "Admin",
    sidebar: "Barra lateral",
    main: "Navegação principal",
    signOut: "Sair",
    terms: "Termos",
    privacy: "Privacidade",
    scheduled: "Agendadas",
    invitations: "Convites",
  },
  home: {
    greetingMorning: "Bom dia",
    greetingAfternoon: "Boa tarde",
    greetingEvening: "Boa noite",
    fallbackName: "por aí",
    heading: "Com quem você quer conversar?",
    newRoomCta: "Nova sala",
    joinWithLink: "Entrar com link",
    joinDisabledHint: "Chega na próxima fase",
    friendRequestsOne: "1 solicitação de amizade",
    friendRequestsMany: "{count} solicitações de amizade",
    friendRequestsSee: "— ver",
    yourFriends: "Seus amigos",
    seeAll: "Ver todos →",
    emptyFriendsTitle: "Nenhum amigo por aqui.",
    emptyFriendsDescription:
      "Adicione alguém em Pessoas para ver quem está online.",
    emptyFriendsAction: "Ir para pessoas",
  },
  account: {
    pageTitle: "Conta",
    pageSubtitle: "Ajuste como você aparece e gerencie o acesso.",
    profileHeading: "Perfil",
    accountHeading: "Conta",
    email: "Email",
    memberSince: "Membro desde",
    displayName: "Nome de exibição",
    displayNameHint: "1-40 caracteres",
    username: "@ username",
    usernameHint: "letras minúsculas, números, _, 3-24 caracteres",
    status: "Status",
    statusHint: "Uma mensagem curta que aparece do lado do seu nome.",
    statusPlaceholder: "Ex: focado, voltarei em 5min…",
    changeAvatar: "Trocar avatar",
    avatarHint: "JPG, PNG, WebP ou GIF. Máximo 2 MB.",
    uploadImageError: "Falha ao subir imagem.",
    networkError: "Erro de rede.",
    saveChanges: "Salvar alterações",
    savedOk: "Alterações salvas.",
    profileNotFound: "Não encontramos seu perfil. Recarregue a página.",
    languageHeading: "Idioma",
    languageDescription:
      "Escolha em qual idioma a interface do Circly aparece pra você.",
    languageLabel: "Idioma da interface",
  },
  landing: {
    signIn: "Entrar",
    createRoom: "Criar sala",
    newRoom: "Nova sala",
    tagline: "Feito para poucas pessoas, com carinho.",
    hero1: "Perto,",
    hero2: "de longe.",
    heroEmphasis: "mesmo",
    description:
      "Uma sala privada para conversar, ver e compartilhar com quem importa. Sem servidores, sem ruído, sem convite público.",
    createOne: "Criar uma sala",
    joinLink: "Entrar com link",
    urlHint: "circly.app/s/",
    feature1Title: "Sua sala",
    feature1Body:
      "Crie, compartilhe um link e convide. Sem cadastro para quem entra.",
    feature2Title: "Sua presença",
    feature2Body:
      "Câmera, voz ou tela — do jeito que fizer sentido no momento.",
    feature3Title: "Suas pessoas",
    feature3Body: "Uma lista curta de amigos, sem timeline, sem barulho.",
    footerBio:
      "Sala privada de videochamada para poucas pessoas. Feito com carinho no Brasil, sem servidor gigante e sem anúncio.",
    footerStatus: "Todos os sistemas operando",
    footerProduct: "Produto",
    footerCircly: "Circly",
    footerContact: "Contato",
    footerCredit: "Feito por",
  },
  languageSwitcher: {
    ariaLabel: "Escolher idioma",
    heading: "Idioma",
  },
  install: {
    ctaShort: "Instalar",
    ctaLong: "Instalar app",
    ariaLabel: "Instalar o Circly como aplicativo",
    dismiss: "Dispensar",
    iosTitle: "Instalar o Circly no iPhone",
    iosStep1: "No Safari, toque no ícone de compartilhar.",
    iosStep2: "Escolha \"Adicionar à Tela de Início\".",
    iosStep3: "Confirme em \"Adicionar\" no canto superior direito.",
    iosClose: "Fechar",
    alreadyInstalled: "App instalado",
  },
  help: {
    openLabel: "Abrir ajuda",
    closeLabel: "Fechar ajuda",
    title: "Ajuda",
    subtitle: "Dúvida, sugestão ou problema.",
    welcome:
      "Escreve aí o que tá travando ou o que você queria — sala, chat, chamada, o que for. Se preferir mandar sugestão ou reclamar, também vale.",
    placeholder: "Escreva sua mensagem…",
    sendLabel: "Enviar",
    disclaimer: "Não compartilhe senhas nem códigos.",
    unavailable: "Resposta indisponível.",
    networkError: "Erro de rede.",
  },
};

const es: Dictionary = {
  common: {
    save: "Guardar",
    saving: "Guardando…",
    saved: "Guardado",
    cancel: "Cancelar",
    confirm: "Confirmar",
    delete: "Eliminar",
    edit: "Editar",
    loading: "Cargando…",
    back: "Volver",
    close: "Cerrar",
    open: "Abrir",
    yes: "Sí",
    no: "No",
    optional: "opcional",
    required: "obligatorio",
  },
  nav: {
    home: "Inicio",
    people: "Personas",
    messages: "Mensajes",
    dmsShort: "MDs",
    newRoom: "Nueva sala",
    newShort: "Nueva",
    account: "Cuenta",
    admin: "Admin",
    sidebar: "Barra lateral",
    main: "Navegación principal",
    signOut: "Salir",
    terms: "Términos",
    privacy: "Privacidad",
    scheduled: "Agendadas",
    invitations: "Invitaciones",
  },
  home: {
    greetingMorning: "Buenos días",
    greetingAfternoon: "Buenas tardes",
    greetingEvening: "Buenas noches",
    fallbackName: "por ahí",
    heading: "¿Con quién quieres hablar?",
    newRoomCta: "Nueva sala",
    joinWithLink: "Entrar con enlace",
    joinDisabledHint: "Llega en la próxima fase",
    friendRequestsOne: "1 solicitud de amistad",
    friendRequestsMany: "{count} solicitudes de amistad",
    friendRequestsSee: "— ver",
    yourFriends: "Tus amigos",
    seeAll: "Ver todos →",
    emptyFriendsTitle: "Nadie por aquí todavía.",
    emptyFriendsDescription:
      "Añade a alguien en Personas para ver quién está en línea.",
    emptyFriendsAction: "Ir a personas",
  },
  account: {
    pageTitle: "Cuenta",
    pageSubtitle: "Ajusta cómo apareces y gestiona tu acceso.",
    profileHeading: "Perfil",
    accountHeading: "Cuenta",
    email: "Correo",
    memberSince: "Miembro desde",
    displayName: "Nombre visible",
    displayNameHint: "1-40 caracteres",
    username: "@ usuario",
    usernameHint: "minúsculas, números, _, 3-24 caracteres",
    status: "Estado",
    statusHint: "Un mensaje corto que aparece junto a tu nombre.",
    statusPlaceholder: "Ej.: concentrado, vuelvo en 5 min…",
    changeAvatar: "Cambiar avatar",
    avatarHint: "JPG, PNG, WebP o GIF. Máximo 2 MB.",
    uploadImageError: "No se pudo subir la imagen.",
    networkError: "Error de red.",
    saveChanges: "Guardar cambios",
    savedOk: "Cambios guardados.",
    profileNotFound: "No encontramos tu perfil. Recarga la página.",
    languageHeading: "Idioma",
    languageDescription:
      "Elige en qué idioma se muestra la interfaz de Circly para ti.",
    languageLabel: "Idioma de la interfaz",
  },
  landing: {
    signIn: "Entrar",
    createRoom: "Crear sala",
    newRoom: "Nueva sala",
    tagline: "Hecho para pocas personas, con cariño.",
    hero1: "Cerca,",
    hero2: "de lejos.",
    heroEmphasis: "incluso",
    description:
      "Una sala privada para hablar, verse y compartir con quien importa. Sin servidores, sin ruido, sin invitación pública.",
    createOne: "Crear una sala",
    joinLink: "Entrar con enlace",
    urlHint: "circly.app/s/",
    feature1Title: "Tu sala",
    feature1Body:
      "Créala, comparte un enlace e invita. Sin registro para quien entra.",
    feature2Title: "Tu presencia",
    feature2Body:
      "Cámara, voz o pantalla — como tenga sentido en el momento.",
    feature3Title: "Tu gente",
    feature3Body: "Una lista corta de amigos, sin muro, sin ruido.",
    footerBio:
      "Sala privada de videollamada para pocas personas. Hecha con cariño en Brasil, sin servidor gigante y sin anuncios.",
    footerStatus: "Todos los sistemas operando",
    footerProduct: "Producto",
    footerCircly: "Circly",
    footerContact: "Contacto",
    footerCredit: "Hecho por",
  },
  languageSwitcher: {
    ariaLabel: "Elegir idioma",
    heading: "Idioma",
  },
  install: {
    ctaShort: "Instalar",
    ctaLong: "Instalar app",
    ariaLabel: "Instalar Circly como aplicación",
    dismiss: "Descartar",
    iosTitle: "Instalar Circly en iPhone",
    iosStep1: "En Safari, toca el icono de compartir.",
    iosStep2: "Elige \"Añadir a pantalla de inicio\".",
    iosStep3: "Confirma en \"Añadir\" en la esquina superior derecha.",
    iosClose: "Cerrar",
    alreadyInstalled: "App instalada",
  },
  help: {
    openLabel: "Abrir ayuda",
    closeLabel: "Cerrar ayuda",
    title: "Ayuda",
    subtitle: "Duda, sugerencia o problema.",
    welcome:
      "Escribe qué te está frenando o qué quieres — sala, chat, llamada, lo que sea. Si prefieres sugerir o quejarte, también sirve.",
    placeholder: "Escribe tu mensaje…",
    sendLabel: "Enviar",
    disclaimer: "No compartas contraseñas ni códigos.",
    unavailable: "Respuesta no disponible.",
    networkError: "Error de red.",
  },
};

const en: Dictionary = {
  common: {
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    loading: "Loading…",
    back: "Back",
    close: "Close",
    open: "Open",
    yes: "Yes",
    no: "No",
    optional: "optional",
    required: "required",
  },
  nav: {
    home: "Home",
    people: "People",
    messages: "Messages",
    dmsShort: "DMs",
    newRoom: "New room",
    newShort: "New",
    account: "Account",
    admin: "Admin",
    sidebar: "Sidebar",
    main: "Main navigation",
    signOut: "Sign out",
    terms: "Terms",
    privacy: "Privacy",
    scheduled: "Scheduled",
    invitations: "Invitations",
  },
  home: {
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    fallbackName: "there",
    heading: "Who do you want to talk to?",
    newRoomCta: "New room",
    joinWithLink: "Join with link",
    joinDisabledHint: "Coming in the next phase",
    friendRequestsOne: "1 friend request",
    friendRequestsMany: "{count} friend requests",
    friendRequestsSee: "— view",
    yourFriends: "Your friends",
    seeAll: "See all →",
    emptyFriendsTitle: "No friends here yet.",
    emptyFriendsDescription:
      "Add someone in People to see who is online.",
    emptyFriendsAction: "Go to people",
  },
  account: {
    pageTitle: "Account",
    pageSubtitle: "Adjust how you appear and manage access.",
    profileHeading: "Profile",
    accountHeading: "Account",
    email: "Email",
    memberSince: "Member since",
    displayName: "Display name",
    displayNameHint: "1-40 characters",
    username: "@ username",
    usernameHint: "lowercase letters, numbers, _, 3-24 characters",
    status: "Status",
    statusHint: "A short message that appears next to your name.",
    statusPlaceholder: "e.g. focused, back in 5 min…",
    changeAvatar: "Change avatar",
    avatarHint: "JPG, PNG, WebP or GIF. Max 2 MB.",
    uploadImageError: "Failed to upload image.",
    networkError: "Network error.",
    saveChanges: "Save changes",
    savedOk: "Changes saved.",
    profileNotFound: "We couldn't find your profile. Please reload.",
    languageHeading: "Language",
    languageDescription:
      "Choose which language the Circly interface uses for you.",
    languageLabel: "Interface language",
  },
  landing: {
    signIn: "Sign in",
    createRoom: "Create room",
    newRoom: "New room",
    tagline: "Built for a few people, with care.",
    hero1: "Close,",
    hero2: "from afar.",
    heroEmphasis: "even",
    description:
      "A private room to talk, see, and share with the people who matter. No servers, no noise, no public invites.",
    createOne: "Create a room",
    joinLink: "Join with link",
    urlHint: "circly.app/s/",
    feature1Title: "Your room",
    feature1Body:
      "Create it, share a link, invite. No sign-up for those who join.",
    feature2Title: "Your presence",
    feature2Body:
      "Camera, voice or screen — whichever makes sense in the moment.",
    feature3Title: "Your people",
    feature3Body: "A short list of friends, no timeline, no noise.",
    footerBio:
      "Private video-call room for a few people. Made with care in Brazil, without a huge server or ads.",
    footerStatus: "All systems operating",
    footerProduct: "Product",
    footerCircly: "Circly",
    footerContact: "Contact",
    footerCredit: "Made by",
  },
  languageSwitcher: {
    ariaLabel: "Choose language",
    heading: "Language",
  },
  install: {
    ctaShort: "Install",
    ctaLong: "Install app",
    ariaLabel: "Install Circly as an app",
    dismiss: "Dismiss",
    iosTitle: "Install Circly on iPhone",
    iosStep1: "In Safari, tap the share icon.",
    iosStep2: "Choose \"Add to Home Screen\".",
    iosStep3: "Confirm on \"Add\" in the top right.",
    iosClose: "Close",
    alreadyInstalled: "App installed",
  },
  help: {
    openLabel: "Open help",
    closeLabel: "Close help",
    title: "Help",
    subtitle: "Question, suggestion or issue.",
    welcome:
      "Write what's blocking you or what you need — room, chat, call, whatever. If you'd rather send a suggestion or a complaint, that works too.",
    placeholder: "Type your message…",
    sendLabel: "Send",
    disclaimer: "Never share passwords or codes.",
    unavailable: "Response unavailable.",
    networkError: "Network error.",
  },
};

export const DICTIONARIES: Record<Locale, Dictionary> = {
  "pt-BR": pt,
  es,
  en,
};
