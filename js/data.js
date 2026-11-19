// Seed data and initial configuration for OTRO
const INITIAL_DATA = {
  categories: [
    { id: 'all', name: 'Todos los Rubros', icon: '✨', count: 0 },
    { id: 'plomeria', name: 'Plomería & Gas', icon: '🔧', count: 0 },
    { id: 'electricidad', name: 'Electricidad', icon: '⚡', count: 0 },
    { id: 'pintura', name: 'Pintura', icon: '🎨', count: 0 },
    { id: 'limpieza', name: 'Limpieza Profunda', icon: '🧹', count: 0 },
    { id: 'muebles', name: 'Armado de Muebles', icon: '🪚', count: 0 },
    { id: 'cerrajeria', name: 'Cerrajería 24hs', icon: '🔑', count: 0 },
    { id: 'fletes', name: 'Fletes & Mudanzas', icon: '🚚', count: 0 },
    { id: 'climatizacion', name: 'Aire & Calefacción', icon: '❄️', count: 0 },
    { id: 'jardineria', name: 'Jardinería', icon: '🌿', count: 0 },
    { id: 'reparaciones', name: 'Reparaciones del Hogar', icon: '🏠', count: 0 }
  ],

  pros: [
    {
      id: 'pro-destacado-1',
      name: 'Matías Benítez',
      title: 'Plomero y Gasista Matriculado',
      category: 'plomeria',
      badge: '🏆 Mejor Puntuado',
      rating: 4.9,
      reviewsCount: 38,
      jobsCompleted: 64,
      hourlyRate: 'Desde $18.000 / visita',
      zone: 'Palermo · Belgrano · Recoleta',
      phone: '5491145678901',
      avatarColor: '#EA580C',
      avatarInitials: 'MB',
      bio: 'Más de 12 años solucionando pérdidas de agua, destapaciones, cambio de griferías, termotanques y calefones. Trabajo limpio y con garantía escrita.',
      skills: ['Pérdidas de agua', 'Termotanques', 'Griferías', 'Gasista Matriculado'],
      completedWorks: [
        {
          title: 'Reemplazo de termotanque 80L y flexible de cobre',
          zone: 'Palermo',
          date: 'Hace 3 días',
          detail: 'Desinstalación de equipo viejo, colocación de válvula de seguridad nueva y prueba de tiraje.'
        },
        {
          title: 'Reparación de pérdida en cuadro de ducha embutido',
          zone: 'Belgrano',
          date: 'Semana pasada',
          detail: 'Cambio de vástagos, asientos y sellado sin romper azulejos.'
        },
        {
          title: 'Instalación de grifería monocomando y filtro bajo mesada',
          zone: 'Caballito',
          date: 'Hace 2 semanas',
          detail: 'Colocación completa en cocina con llaves de paso nuevas.'
        }
      ],
      reviews: [
        {
          author: 'Laura Gómez',
          zone: 'Palermo',
          rating: 5,
          date: 'Hace 3 días',
          comment: 'Vino en el día como prometió, súper prolijo y honesto con los repuestos. Me dejó el termotanque funcionando impecable.'
        },
        {
          author: 'Martín Salgado',
          zone: 'Belgrano',
          rating: 5,
          date: 'Hace 1 semana',
          comment: 'Excelente atención. Me explicó cuál era el problema de presión en el baño y lo resolvió en una hora.'
        },
        {
          author: 'Sofía Pereyra',
          zone: 'Recoleta',
          rating: 5,
          date: 'Hace 3 semanas',
          comment: 'Muy recomendable, puntual y dejó todo limpio después de cambiar la grifería de la cocina.'
        }
      ]
    },
    {
      id: 'pro-destacado-2',
      name: 'Hernán Quiroga',
      title: 'Electricista Domiciliario & Tableros',
      category: 'electricidad',
      badge: '⭐ Muy Recomendado',
      rating: 5.0,
      reviewsCount: 29,
      jobsCompleted: 51,
      hourlyRate: 'Desde $16.000 / visita',
      zone: 'Caballito · Almagro · Villa Crespo',
      phone: '5491156789012',
      avatarColor: '#0284C7',
      avatarInitials: 'HQ',
      bio: 'Especialista en cortocircuitos, cambio de térmicas y disyuntores, colocación de artefactos de iluminación LED, ventiladores de techo y tomas nuevos.',
      skills: ['Cortocircuitos', 'Térmicas y Disyuntores', 'Luminarias LED', 'Ventiladores de techo'],
      completedWorks: [
        {
          title: 'Actualización de tablero eléctrico con disyuntor diferencial',
          zone: 'Caballito',
          date: 'Hace 2 días',
          detail: 'Separación de circuitos de aire acondicionado y tomas para evitar que salte la térmica.'
        },
        {
          title: 'Instalación de 2 ventiladores de techo con control remoto',
          zone: 'Villa Crespo',
          date: 'Hace 5 días',
          detail: 'Armado, balanceo y cableado reforzado en dormitorio y living.'
        },
        {
          title: 'Colocación de 8 plafones LED y reparación de cortocircuito',
          zone: 'Almagro',
          date: 'Hace 2 semanas',
          detail: 'Detección de cable sulfatado en caja de techo y recableado seguro.'
        }
      ],
      reviews: [
        {
          author: 'Diego Fernández',
          zone: 'Caballito',
          rating: 5,
          date: 'Hace 2 días',
          comment: 'Se me cortaba la luz cada vez que prendía el horno eléctrico. Hernán encontró la falla enseguida y armó el tablero a nuevo.'
        },
        {
          author: 'Camila Rossi',
          zone: 'Villa Crespo',
          rating: 5,
          date: 'Hace 5 días',
          comment: 'Instaló dos ventiladores de techo rapidísimo, sin ensuciar nada y cobró exactamente lo que habíamos presupuestado.'
        }
      ]
    },
    {
      id: 'pro-destacado-3',
      name: 'Lucas Varela',
      title: 'Carpintero, Armado de Muebles & Colocaciones',
      category: 'muebles',
      badge: '🏆 Mejor Puntuado',
      rating: 4.9,
      reviewsCount: 44,
      jobsCompleted: 78,
      hourlyRate: 'Desde $15.000',
      zone: 'Nuñez · Saavedra · Belgrano · Vicente López',
      phone: '5491167890123',
      avatarColor: '#D97706',
      avatarInitials: 'LV',
      bio: 'Armado de muebles en caja (placares, escritorios, alacenas), colgado de TV con soporte, cortinas roller, cuadros pesados, estantes flotantes y regulación de puertas.',
      skills: ['Armado de placares', 'Soportes de TV', 'Cortinas y cuadros', 'Bisagras y puertas'],
      completedWorks: [
        {
          title: 'Armado de placard de 6 puertas y 2 mesas de luz',
          zone: 'Nuñez',
          date: 'Ayer',
          detail: 'Armado completo a escuadra, regulación de correderas metálicas y fijación a pared.'
        },
        {
          title: 'Colocación de soporte articulado para TV 65" y 4 cortinas roller',
          zone: 'Belgrano',
          date: 'Hace 4 días',
          detail: 'Nivelación láser con tarugos para ladrillo hueco de alta resistencia.'
        },
        {
          title: 'Reparación de bisagras de alacena de cocina y estantes a medida',
          zone: 'Saavedra',
          date: 'Hace 1 semana',
          detail: 'Reemplazo de bisagras cazoleta con cierre suave.'
        }
      ],
      reviews: [
        {
          author: 'Valeria Méndez',
          zone: 'Nuñez',
          rating: 5,
          date: 'Ayer',
          comment: 'Un genio Lucas. Armó un placard enorme en una tarde, quedó súper firme y las puertas cierran perfecto.'
        },
        {
          author: 'Nicolás Paz',
          zone: 'Belgrano',
          rating: 5,
          date: 'Hace 4 días',
          comment: 'Trajo todas las herramientas, nivel láser y aspiradora de mano para no dejar polvo al agujerear la pared. 10 puntos.'
        }
      ]
    },
    {
      id: 'pro-destacado-4',
      name: 'Gustavo Morales',
      title: 'Pintor de Obra & Reparación de Humedad',
      category: 'pintura',
      badge: '⭐ Muy Recomendado',
      rating: 4.8,
      reviewsCount: 31,
      jobsCompleted: 47,
      hourlyRate: 'Presupuesto sin cargo',
      zone: 'CABA y Zona Norte',
      phone: '5491178901234',
      avatarColor: '#16A34A',
      avatarInitials: 'GM',
      bio: 'Pintura interior y exterior, enduido, arreglo de grietas y manchas de humedad en techos de baño y paredes, impermeabilización de terrazas y barnizado.',
      skills: ['Pintura de ambientes', 'Humedad y enduido', 'Impermeabilización', 'Cielorrasos'],
      completedWorks: [
        {
          title: 'Pintura completa de departamento 2 ambientes',
          zone: 'Palermo',
          date: 'Semana pasada',
          detail: 'Preparación de paredes con enduido, lijado y 2 manos de látex lavable primera marca.'
        },
        {
          title: 'Reparación y pintura antihongos en techo de baño',
          zone: 'Caballito',
          date: 'Hace 2 semanas',
          detail: 'Raspado de descascarado, fijador sellador y pintura especial para cielorraso.'
        }
      ],
      reviews: [
        {
          author: 'Mariana Duarte',
          zone: 'Palermo',
          rating: 5,
          date: 'Semana pasada',
          comment: 'Tapó todos los muebles y pisos con nylon antes de empezar. Terminó en 2 días como habíamos pactado y quedó como nuevo.'
        },
        {
          author: 'Federico Luna',
          zone: 'Caballito',
          rating: 5,
          date: 'Hace 2 semanas',
          comment: 'Me arregló el techo del baño que se había descascarado por el vapor. Muy prolijo y precio súper razonable.'
        }
      ]
    },
    {
      id: 'pro-destacado-5',
      name: 'Ramiro Villalba',
      title: 'Técnico en Aire Acondicionado & Climatización',
      category: 'climatizacion',
      badge: '🏆 Mejor Puntuado',
      rating: 4.9,
      reviewsCount: 26,
      jobsCompleted: 43,
      hourlyRate: 'Desde $22.000',
      zone: 'Villa Urquiza · Devoto · Belgrano · Palermo',
      phone: '5491189012345',
      avatarColor: '#0369A1',
      avatarInitials: 'RV',
      bio: 'Instalación, desinstalación, carga de gas y limpieza profunda de aires acondicionados split. Solución de goteos hacia adentro y mantenimiento preventivo.',
      skills: ['Instalación Split', 'Carga de gas', 'Limpieza de filtros', 'Reparación de goteo'],
      completedWorks: [
        {
          title: 'Instalación de aire Split Inverter 3000 frigorías',
          zone: 'Villa Urquiza',
          date: 'Hace 4 días',
          detail: 'Instalación con bomba de vacío, ménsulas reforzadas y 3 metros de cañería de cobre.'
        },
        {
          title: 'Limpieza profunda y destapación de manguera de desagote',
          zone: 'Devoto',
          date: 'Hace 1 semana',
          detail: 'Solución a equipo que tiraba agua hacia el dormitorio y desinfección de turbina.'
        }
      ],
      reviews: [
        {
          author: 'Julieta Blanco',
          zone: 'Villa Urquiza',
          rating: 5,
          date: 'Hace 4 días',
          comment: 'Vino con bomba de vacío y todos los materiales. Quedó enfriando bárbaro y muy prolija la salida a la pared.'
        },
        {
          author: 'Pablo Acosta',
          zone: 'Devoto',
          rating: 5,
          date: 'Hace 1 semana',
          comment: 'El aire me goteaba adentro de la pieza. Lo desarmó, limpió la bandeja y el desagote en 40 minutos. Un fenómeno.'
        }
      ]
    }
  ],
  initialTasks: []
};
