// Seed data and initial configuration for OTRO
const INITIAL_DATA = {
  categories: [
    { id: 'all', name: 'Todos los Rubros', icon: '✨', count: 28 },
    { id: 'plomeria', name: 'Plomería & Gas', icon: '🔧', count: 8 },
    { id: 'electricidad', name: 'Electricidad', icon: '⚡', count: 7 },
    { id: 'pintura', name: 'Pintura', icon: '🎨', count: 5 },
    { id: 'limpieza', name: 'Limpieza Profunda', icon: '🧹', count: 9 },
    { id: 'muebles', name: 'Armado de Muebles', icon: '🪚', count: 4 },
    { id: 'cerrajeria', name: 'Cerrajería 24hs', icon: '🔑', count: 6 },
    { id: 'fletes', name: 'Fletes & Mudanzas', icon: '🚚', count: 5 },
    { id: 'climatizacion', name: 'Aire & Calefacción', icon: '❄️', count: 6 },
    { id: 'jardineria', name: 'Jardinería', icon: '🌿', count: 4 },
    { id: 'reparaciones', name: 'Reparaciones del Hogar', icon: '🏠', count: 11 }
  ],

  pros: [
    {
      id: 'pro-1',
      name: 'Matías Benítez',
      title: 'Plomero Matriculado & Gasista',
      category: 'plomeria',
      badge: 'Top Pro Verificado',
      rating: 4.9,
      reviewsCount: 84,
      jobsCompleted: 112,
      hourlyRate: '$14.000 / visita',
      zone: 'Palermo, Colegiales y Belgrano',
      phone: '5491145678901',
      avatarColor: '#2563EB',
      avatarInitials: 'MB',
      bio: 'Especialista en detección de filtraciones, instalación de griferías, bombas presurizadoras y termos solares/eléctricos. 12 años de experiencia con garantía escrita en cada trabajo.',
      skills: ['Termofusión', 'Griferías', 'Destapaciones', 'Bombas Rowa', 'Urgencias'],
      whatsappText: 'Hola Matías, vi tu perfil en OTRO y me gustaría consultarte por un trabajo de plomería.',
      reviews: [
        { author: 'Florencia K.', rating: 5, date: 'Hace 2 días', comment: 'Llegó en 30 minutos a reparar una pérdida de la canilla de la cocina. Impecable y súper prolijo.' },
        { author: 'Esteban R.', rating: 5, date: 'Hace 1 semana', comment: 'Muy profesional. Presupuesto claro y solucionó el problema en el día.' }
      ]
    },
    {
      id: 'pro-2',
      name: 'Lucía Albarracín',
      title: 'Electricista Domiciliaria & Smart Home',
      category: 'electricidad',
      badge: 'Garantía OTRO',
      rating: 5.0,
      reviewsCount: 67,
      jobsCompleted: 89,
      hourlyRate: '$12.500 / hora',
      zone: 'Caballito, Almagro y Villa Crespo',
      phone: '5491156789012',
      avatarColor: '#D97706',
      avatarInitials: 'LA',
      bio: 'Técnica electricista. Cableados completos, armado de tableros con disyuntor y térmicas, iluminación LED moderna y domótica Sonoff/Tuya para el hogar.',
      skills: ['Tableros Eléctricos', 'Iluminación LED', 'Cortocircuitos', 'Domótica', 'Medición de Puesta a Tierra'],
      whatsappText: 'Hola Lucía, vi tu perfil en OTRO y necesito cotizar un trabajo eléctrico en casa.',
      reviews: [
        { author: 'Marcos V.', rating: 5, date: 'Hace 4 días', comment: 'Reemplazó el tablero principal e instaló luces perimetrales. Una genia total, super puntual.' }
      ]
    },
    {
      id: 'pro-3',
      name: 'Carlos Santillán',
      title: 'Montaje de Muebles & Carpintería',
      category: 'muebles',
      badge: 'Rápida Respuesta',
      rating: 4.8,
      reviewsCount: 45,
      jobsCompleted: 63,
      hourlyRate: '$11.000 / servicio',
      zone: 'Recoleta, Barrio Norte y Retiro',
      phone: '5491167890123',
      avatarColor: '#059669',
      avatarInitials: 'CS',
      bio: 'Armador profesional de muebles de melamina (IKEA, Platinum, Mosconi). Instalación de racks de TV, alacenas, cortinas roller y repisas.',
      skills: ['Muebles RTA', 'Racks TV flotantes', 'Alacenas', 'Herrajes', 'Nivelación láser'],
      whatsappText: 'Hola Carlos, te contacto desde la app OTRO para armar unos muebles.',
      reviews: [
        { author: 'Valeria D.', rating: 5, date: 'Ayer', comment: 'Armó un placard de 4 puertas en tiempo récord y dejó todo limpio. Muy recomendable.' }
      ]
    },
    {
      id: 'pro-4',
      name: 'Equipo Brillo Total (Carla & Asoc.)',
      title: 'Limpieza Profunda & Fin de Obra',
      category: 'limpieza',
      badge: 'Equipo Verificado',
      rating: 4.9,
      reviewsCount: 92,
      jobsCompleted: 140,
      hourlyRate: '$10.000 / hora',
      zone: 'Toda CABA y Zona Norte',
      phone: '5491178901234',
      avatarColor: '#7C3AED',
      avatarInitials: 'BT',
      bio: 'Servicios de limpieza integral para departamentos y casas. Limpieza profunda pre-mudanza, post-obra, limpieza de vidrios de altura y desinfección con vapor.',
      skills: ['Post Obra', 'Pre Mudanza', 'Vidrios', 'Tapizados a Vapor', 'Productos ecológicos'],
      whatsappText: 'Hola Carla, te escribo desde OTRO para consultar por un servicio de limpieza.',
      reviews: [
        { author: 'Guillermo F.', rating: 5, date: 'Hace 3 días', comment: 'Contraté para fin de obra en un 3 ambientes. Quedó impecable para entrar a vivir.' }
      ]
    },
    {
      id: 'pro-5',
      name: 'Diego Morales',
      title: 'Pintura de Interiores & Exteriores',
      category: 'pintura',
      badge: 'Top Pro Verificado',
      rating: 4.9,
      reviewsCount: 53,
      jobsCompleted: 78,
      hourlyRate: '$13.000 / m2 o día',
      zone: 'Nuñez, Saavedra y Vicente López',
      phone: '5491189012345',
      avatarColor: '#E11D48',
      avatarInitials: 'DM',
      bio: 'Pintor profesional con 15 años en el oficio. Preparación de superficies, enduido completo, impermeabilización de terrazas y colocación de molduras.',
      skills: ['Látex Interior', 'Esmalte Sintético', 'Impermeabilización', 'Enduido', 'Pintura Airless'],
      whatsappText: 'Hola Diego, vi tu perfil en OTRO y quiero cotizar la pintura de mi departamento.',
      reviews: [
        { author: 'Santiago P.', rating: 5, date: 'Hace 5 días', comment: 'Pintó todo el living comedor en 2 días. Prolijidad absoluta con los zócalos y pisos protegidos.' }
      ]
    },
    {
      id: 'pro-6',
      name: 'Joaquín Vega',
      title: 'Técnico en Refrigeración & Split',
      category: 'climatizacion',
      badge: 'Matriculado CACAAV',
      rating: 4.8,
      reviewsCount: 39,
      jobsCompleted: 51,
      hourlyRate: '$18.000 / servicio',
      zone: 'San Isidro, Olivos y Belgrano',
      phone: '5491190123456',
      avatarColor: '#0284C7',
      avatarInitials: 'JV',
      bio: 'Instalación y mantenimiento de aires acondicionados split e inverter. Carga de gas ecológico R410a, limpieza de filtros y diagnóstico electrónico.',
      skills: ['Instalación Split', 'Carga de Gas', 'Service Preventivo', 'Inverter', 'Reparación de Placas'],
      whatsappText: 'Hola Joaquín, te contacto desde la app OTRO para hacer service de un aire acondicionado.',
      reviews: [
        { author: 'Romina T.', rating: 5, date: 'Hace 6 días', comment: 'Detectó la fuga que otros dos técnicos no encontraron. Excelente atención.' }
      ]
    }
  ],

  initialTasks: [
    {
      id: 'task-101',
      title: 'Reparar pérdida de agua en vanitory y canilla monocomando',
      category: 'plomeria',
      description: 'Gotea por debajo de la mesada del baño principal y la canilla monocomando está floja. Necesito alguien que venga hoy o mañana por la mañana con herramientas.',
      location: 'Palermo Soho (CABA)',
      urgency: 'Urgente (Hoy)',
      urgencyLevel: 'high',
      budget: '$25.000 - $35.000',
      clientName: 'Facundo M.',
      createdAt: 'Hace 2 horas',
      status: 'open', // 'open' | 'assigned' | 'completed'
      bids: [
        {
          id: 'bid-1',
          proId: 'pro-1',
          proName: 'Matías Benítez',
          proRating: 4.9,
          amount: '$28.000',
          message: 'Hola Facundo! Puedo pasar hoy a las 16:30 hs. Llevo selladores, flexibles nuevos de repuesto y ajusto la monocomando.',
          date: 'Hace 45 min',
          status: 'pending' // 'pending' | 'accepted' | 'rejected'
        }
      ]
    },
    {
      id: 'task-102',
      title: 'Instalación de 3 luminarias colgantes y cambio de 4 tomas dobles',
      category: 'electricidad',
      description: 'Compré 3 lámparas nórdicas para la barra de la cocina y quiero cambiar los tomas viejos por unos marca Kalop blancos nuevos.',
      location: 'Caballito (CABA)',
      urgency: 'Esta semana',
      urgencyLevel: 'medium',
      budget: '$30.000 - $45.000',
      clientName: 'Mariana Gomez',
      createdAt: 'Hace 4 horas',
      status: 'open',
      bids: [
        {
          id: 'bid-2',
          proId: 'pro-2',
          proName: 'Lucía Albarracín',
          proRating: 5.0,
          amount: '$35.000',
          message: 'Hola Mariana! Tengo disponibilidad este jueves por la tarde. Incluye nivelación precisa y testeo de carga de los tomas.',
          date: 'Hace 2 horas',
          status: 'pending'
        }
      ]
    },
    {
      id: 'task-103',
      title: 'Armado de placard de 3 puertas corredizas y cajonera',
      category: 'muebles',
      description: 'Llegó en caja desarmado. Mide 1.80m de ancho x 2.10m de alto. Se necesita armador con experiencia previa y atornillador a batería.',
      location: 'Belgrano R (CABA)',
      urgency: 'Viernes o Sábado',
      urgencyLevel: 'low',
      budget: '$40.000 - $55.000',
      clientName: 'Andrés V.',
      createdAt: 'Hace 6 horas',
      status: 'open',
      bids: [
        {
          id: 'bid-3',
          proId: 'pro-3',
          proName: 'Carlos Santillán',
          proRating: 4.8,
          amount: '$45.000',
          message: 'Hola Andrés, armo ese modelo habitualmente. Puedo ir el sábado a las 10:00 am puntual.',
          date: 'Hace 3 horas',
          status: 'pending'
        }
      ]
    },
    {
      id: 'task-104',
      title: 'Pintar habitación de 3x3 (Paredes en blanco mate)',
      category: 'pintura',
      description: 'Habitación vacía, tiene dos pequeñas fisuras superficiales para tapar con enduido antes de pintar. Ya cuento con la pintura.',
      location: 'Villa Urquiza (CABA)',
      urgency: 'Próxima semana',
      urgencyLevel: 'medium',
      budget: '$50.000 - $70.000',
      clientName: 'Gonzalo P.',
      createdAt: 'Ayer',
      status: 'open',
      bids: [
        {
          id: 'bid-4',
          proId: 'pro-5',
          proName: 'Diego Morales',
          proRating: 4.9,
          amount: '$58.000',
          message: 'Hola Gonzalo! Llevo lija, espátulas y cinta de pintor. Lo hacemos en una jornada completa dejándolo impecable.',
          date: 'Ayer',
          status: 'pending'
        }
      ]
    }
  ]
};
