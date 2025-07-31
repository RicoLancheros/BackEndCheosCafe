import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seeding de la base de datos...')

  // Crear usuario administrador
  const hashedPassword = await bcrypt.hash('Admin123!', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cheoscafe.com' },
    update: {},
    create: {
      email: 'admin@cheoscafe.com',
      password: hashedPassword,
      name: 'Administrador Principal',
      phone: '+573001234567',
      role: 'ADMIN',
      isActive: true,
      emailVerified: true
    }
  })

  console.log('✅ Usuario administrador creado:', admin.email)

  // Crear productos iniciales (usando los datos del script SQL)
  const products = [
    {
      sku: 'CAF-MAR-500',
      name: 'Café Premium Marinilla',
      description: 'Café de origen único cultivado en las montañas de Marinilla. Notas distintivas a chocolate oscuro y frutos rojos maduros. Proceso de lavado tradicional.',
      price: 28000,
      stock: 50,
      image: '/images/cafe-marinilla.jpg',
      weight: '500g',
      origin: 'Marinilla, Antioquia',
      roastLevel: 'Medio',
      featured: true
    },
    {
      sku: 'CAF-GUA-500',
      name: 'Café Especial Guarne',
      description: 'Café suave y equilibrado con notas cítricas y florales. Cultivado a 1,800 metros sobre el nivel del mar en las fincas familiares de Guarne.',
      price: 32000,
      stock: 30,
      image: '/images/cafe-guarne.jpg',
      weight: '500g',
      origin: 'Guarne, Antioquia',
      roastLevel: 'Medio-Claro',
      featured: true
    },
    {
      sku: 'CAF-TRA-500',
      name: 'Café Tradicional',
      description: 'Blend especial de los mejores cafés antiqueños. Sabor balanceado con cuerpo medio, ideal para el consumo diario. El favorito de nuestros clientes.',
      price: 22000,
      stock: 100,
      image: '/images/cafe-tradicional.jpg',
      weight: '500g',
      origin: 'Antioquia',
      roastLevel: 'Medio',
      featured: false
    },
    {
      sku: 'CAF-DES-250',
      name: 'Café Descafeinado',
      description: 'Todo el sabor y aroma del café colombiano sin cafeína. Proceso de descafeinización natural con agua de montaña.',
      price: 25000,
      stock: 40,
      image: '/images/cafe-descafeinado.jpg',
      weight: '250g',
      origin: 'Antioquia',
      roastLevel: 'Medio',
      featured: false
    },
    {
      sku: 'CAF-PAC-500',
      name: 'Pack Degustación',
      description: 'Descubre la diversidad de nuestros cafés con 4 variedades de 125g cada una: Marinilla, Guarne, Honey y Tradicional. Perfecto para regalo.',
      price: 45000,
      stock: 20,
      image: '/images/pack-degustacion.jpg',
      weight: '500g',
      origin: 'Varios Orígenes',
      roastLevel: 'Variado',
      featured: true
    },
    {
      sku: 'CAF-HON-500',
      name: 'Café Honey Process',
      description: 'Procesado con el método honey que resalta las notas dulces naturales del café. Sabores a miel, caramelo y frutas tropicales.',
      price: 38000,
      stock: 25,
      image: '/images/cafe-honey.jpg',
      weight: '500g',
      origin: 'Santa Rosa de Osos',
      roastLevel: 'Medio-Oscuro',
      featured: false
    },
    {
      sku: 'CAF-GEI-250',
      name: 'Café Geisha',
      description: 'Variedad exclusiva Geisha con notas florales intensas, jazmín y bergamota. Una experiencia sensorial única para paladares exigentes.',
      price: 55000,
      stock: 15,
      image: '/images/cafe-geisha.jpg',
      weight: '250g',
      origin: 'Yarumal',
      roastLevel: 'Claro',
      featured: true
    },
    {
      sku: 'CAF-COL-500',
      name: 'Café Cold Brew',
      description: 'Molido especialmente para preparación en frío. Granos seleccionados que producen una bebida suave, dulce y refrescante.',
      price: 30000,
      stock: 35,
      image: '/images/cafe-coldbrew.jpg',
      weight: '500g',
      origin: 'Antioquia',
      roastLevel: 'Oscuro',
      featured: false
    }
  ]

  for (const productData of products) {
    const product = await prisma.product.upsert({
      where: { sku: productData.sku },
      update: {},
      create: productData
    })
    console.log(`✅ Producto creado: ${product.name}`)
  }

  // Crear ubicaciones iniciales
  const locations = [
    {
      name: 'Tienda Principal Marinilla',
      slug: 'tienda-principal-marinilla',
      city: 'Marinilla',
      address: 'Carrera 30 #29-45, Centro',
      lat: 6.1736,
      lng: -75.3369,
      phone: '6043001234',
      whatsapp: '573001234567',
      hours: {
        lunes: '8:00-19:00',
        martes: '8:00-19:00',
        miercoles: '8:00-19:00',
        jueves: '8:00-19:00',
        viernes: '8:00-19:00',
        sabado: '8:00-19:00',
        domingo: 'Cerrado'
      }
    },
    {
      name: 'Punto de Venta Guarne',
      slug: 'punto-venta-guarne',
      city: 'Guarne',
      address: 'Calle 50 #50-20, Plaza Principal',
      lat: 6.2778,
      lng: -75.4419,
      phone: '6043005678',
      whatsapp: '573009876543',
      hours: {
        lunes: '9:00-18:00',
        martes: '9:00-18:00',
        miercoles: '9:00-18:00',
        jueves: '9:00-18:00',
        viernes: '9:00-18:00',
        sabado: 'Cerrado',
        domingo: 'Cerrado'
      }
    },
    {
      name: 'Café San Vicente',
      slug: 'cafe-san-vicente',
      city: 'San Vicente Ferrer',
      address: 'Parque Principal, Local 3',
      lat: 6.2833,
      lng: -75.3333,
      phone: '6043002345',
      whatsapp: '573002345678',
      hours: {
        lunes: 'Cerrado',
        martes: '10:00-20:00',
        miercoles: '10:00-20:00',
        jueves: '10:00-20:00',
        viernes: '10:00-20:00',
        sabado: '10:00-20:00',
        domingo: '10:00-20:00'
      }
    },
    {
      name: 'Tienda Yarumal',
      slug: 'tienda-yarumal',
      city: 'Yarumal',
      address: 'Carrera 20 #20-15, Zona Centro',
      lat: 6.9669,
      lng: -75.4194,
      phone: '6043003456',
      whatsapp: '573003456789',
      hours: {
        lunes: '8:00-18:00',
        martes: '8:00-18:00',
        miercoles: '8:00-18:00',
        jueves: '8:00-18:00',
        viernes: '8:00-18:00',
        sabado: '8:00-18:00',
        domingo: 'Cerrado'
      }
    },
    {
      name: 'Punto Santa Rosa',
      slug: 'punto-santa-rosa',
      city: 'Santa Rosa de Osos',
      address: 'Calle 30 #30-25, Centro Comercial',
      lat: 6.6447,
      lng: -75.4606,
      phone: '6043004567',
      whatsapp: '573004567890',
      hours: {
        lunes: '9:00-19:00',
        martes: '9:00-19:00',
        miercoles: '9:00-19:00',
        jueves: '9:00-19:00',
        viernes: '9:00-19:00',
        sabado: 'Cerrado',
        domingo: 'Cerrado'
      }
    },
    {
      name: 'Café Prado Centro',
      slug: 'cafe-prado-centro',
      city: 'Medellín',
      address: 'Calle 67 #51-73, Prado Centro',
      lat: 6.2650,
      lng: -75.5658,
      phone: '6043005678',
      whatsapp: '573005678901',
      hours: {
        lunes: '7:00-21:00',
        martes: '7:00-21:00',
        miercoles: '7:00-21:00',
        jueves: '7:00-21:00',
        viernes: '7:00-21:00',
        sabado: '7:00-21:00',
        domingo: '7:00-21:00'
      }
    },
    {
      name: 'Tienda El Hueco',
      slug: 'tienda-el-hueco',
      city: 'Medellín',
      address: 'Carrera 53 #48-25, El Hueco',
      lat: 6.2476,
      lng: -75.5658,
      phone: '6043006789',
      whatsapp: '573006789012',
      hours: {
        lunes: '8:00-20:00',
        martes: '8:00-20:00',
        miercoles: '8:00-20:00',
        jueves: '8:00-20:00',
        viernes: '8:00-20:00',
        sabado: '8:00-20:00',
        domingo: 'Cerrado'
      }
    },
    {
      name: 'Pueblito Paisa',
      slug: 'pueblito-paisa',
      city: 'Medellín',
      address: 'Cerro Nutibara, Pueblito Paisa',
      lat: 6.2342,
      lng: -75.5812,
      phone: '6043007890',
      whatsapp: '573007890123',
      hours: {
        lunes: 'Cerrado',
        martes: '9:00-18:00',
        miercoles: '9:00-18:00',
        jueves: '9:00-18:00',
        viernes: '9:00-18:00',
        sabado: '9:00-18:00',
        domingo: '9:00-18:00'
      }
    }
  ]

  for (const locationData of locations) {
    const location = await prisma.location.upsert({
      where: { slug: locationData.slug },
      update: {},
      create: locationData
    })
    console.log(`✅ Ubicación creada: ${location.name}`)
  }

  // Crear códigos de descuento
  const discountCodes = [
    {
      code: 'BIENVENIDO10',
      description: 'Descuento de bienvenida 10%',
      type: 'PERCENTAGE' as const,
      value: 10,
      minAmount: 20000,
      maxUses: 100,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000) // 3 meses
    },
    {
      code: 'CAFE5MIL',
      description: 'Descuento de $5,000',
      type: 'FIXED_AMOUNT' as const,
      value: 5000,
      minAmount: 30000,
      maxUses: 50,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 1 mes
    },
    {
      code: 'VERANO15',
      description: 'Descuento de verano 15%',
      type: 'PERCENTAGE' as const,
      value: 15,
      minAmount: 40000,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 2 * 30 * 24 * 60 * 60 * 1000) // 2 meses
    }
  ]

  for (const discountData of discountCodes) {
    const discount = await prisma.discountCode.upsert({
      where: { code: discountData.code },
      update: {},
      create: discountData
    })
    console.log(`✅ Código de descuento creado: ${discount.code}`)
  }

  console.log('🎉 Seeding completado exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })