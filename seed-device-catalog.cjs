const { Pool } = require('pg');

async function seedDeviceCatalog() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Starting device catalog seeding...');
    
    // Define manufacturers
    const manufacturers = [
      {
        name: 'SolarEdge',
        logoUrl: '/images/manufacturer_logos/solaredge.png',
        website: 'https://www.solaredge.com',
        country: 'Israel',
        description: 'SolarEdge is a global leader in smart energy technology, providing innovative products that power our lives with renewable energy.',
        contactEmail: 'info@solaredge.com',
        contactPhone: '+1-800-123-4567'
      },
      {
        name: 'Tesla',
        logoUrl: '/images/manufacturer_logos/tesla.png',
        website: 'https://www.tesla.com',
        country: 'USA',
        description: 'Tesla is accelerating the world\'s transition to sustainable energy with electric vehicles, solar, and integrated renewable energy solutions.',
        contactEmail: 'support@tesla.com',
        contactPhone: '+1-888-518-3752'
      },
      {
        name: 'LG Energy Solution',
        logoUrl: '/images/manufacturer_logos/lg.png',
        website: 'https://www.lgensol.com',
        country: 'South Korea',
        description: 'LG Energy Solution is a leading global manufacturer of lithium-ion batteries for electric vehicles, mobility, IT and energy storage systems.',
        contactEmail: 'info@lgensol.com',
        contactPhone: '+82-2-3773-1114'
      },
      {
        name: 'Fronius',
        logoUrl: '/images/manufacturer_logos/fronius.png',
        website: 'https://www.fronius.com',
        country: 'Austria',
        description: 'Fronius is a global leader in solar energy, developing innovative technologies for converting and controlling electrical energy.',
        contactEmail: 'contact@fronius.com',
        contactPhone: '+43-7242-241-0'
      },
      {
        name: 'ABB',
        logoUrl: '/images/manufacturer_logos/abb.png',
        website: 'https://www.abb.com',
        country: 'Switzerland',
        description: 'ABB is a leading global technology company providing solutions in electrification, robotics, automation, and motion.',
        contactEmail: 'contact@abb.com',
        contactPhone: '+41-43-317-7111'
      },
      {
        name: 'Schneider Electric',
        logoUrl: '/images/manufacturer_logos/schneider.png',
        website: 'https://www.se.com',
        country: 'France',
        description: 'Schneider Electric is a global leader in energy management and automation, providing integrated solutions across multiple market segments.',
        contactEmail: 'info@schneider-electric.com',
        contactPhone: '+33-1-4129-7000'
      },
      {
        name: 'BYD',
        logoUrl: '/images/manufacturer_logos/byd.png',
        website: 'https://www.byd.com',
        country: 'China',
        description: 'BYD is a leading high-tech company specializing in the automotive industry, energy storage solutions, and electronics.',
        contactEmail: 'info@byd.com',
        contactPhone: '+86-755-8988-8888'
      },
      {
        name: 'ChargePoint',
        logoUrl: '/images/manufacturer_logos/chargepoint.png',
        website: 'https://www.chargepoint.com',
        country: 'USA',
        description: 'ChargePoint is creating a new fueling network to move all people and goods on electricity with one of the largest EV charging networks.',
        contactEmail: 'support@chargepoint.com',
        contactPhone: '+1-877-370-3802'
      },
      {
        name: 'Daikin',
        logoUrl: '/images/manufacturer_logos/daikin.png',
        website: 'https://www.daikin.com',
        country: 'Japan',
        description: 'Daikin is a global leader in air conditioning systems, offering innovative solutions for residential, commercial, and industrial applications.',
        contactEmail: 'info@daikin.com',
        contactPhone: '+81-6-6373-4312'
      },
      {
        name: 'Mitsubishi Electric',
        logoUrl: '/images/manufacturer_logos/mitsubishi.png',
        website: 'https://www.mitsubishielectric.com',
        country: 'Japan',
        description: 'Mitsubishi Electric is a global leader in the manufacture and sales of electrical and electronic products, including HVAC systems.',
        contactEmail: 'info@mitsubishielectric.com',
        contactPhone: '+81-3-3218-2111'
      }
    ];
    
    // Insert manufacturers
    console.log('Inserting manufacturers...');
    for (const manufacturer of manufacturers) {
      const result = await pool.query(
        `INSERT INTO device_manufacturers 
         (name, logo_url, website, country, description, contact_email, contact_phone) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (name) DO UPDATE SET 
           logo_url = $2,
           website = $3,
           country = $4,
           description = $5,
           contact_email = $6,
           contact_phone = $7
         RETURNING id`,
        [
          manufacturer.name, 
          manufacturer.logoUrl, 
          manufacturer.website,
          manufacturer.country,
          manufacturer.description,
          manufacturer.contactEmail,
          manufacturer.contactPhone
        ]
      );
      
      manufacturer.id = result.rows[0].id;
      console.log(`Manufacturer ${manufacturer.name} inserted with ID ${manufacturer.id}`);
    }
    
    // Define catalog entries for solar PV
    const solarDevices = [
      {
        manufacturerId: manufacturers.find(m => m.name === 'SolarEdge').id,
        name: 'SolarEdge Three Phase Inverter',
        modelNumber: 'SE15K',
        type: 'solar_pv',
        releaseYear: 2021,
        imageUrl: '/images/devices/solaredge_se15k.png',
        thumbnailUrl: '/images/devices/thumbnails/solaredge_se15k_thumb.png',
        capacity: 15,
        maxPower: 15000,
        efficiency: 98.3,
        dimensions: '940 x 315 x 184 mm',
        weight: 36.5,
        shortDescription: 'High-efficiency three-phase solar inverter suitable for residential and commercial installations',
        fullDescription: 'The SolarEdge Three Phase Inverter (SE15K) combines sophisticated digital control technology with efficient power conversion to achieve superior solar harvesting and maximum power production. The fixed-voltage technology ensures the solar inverter is always working at its optimal input voltage, regardless of string length or temperature.',
        features: JSON.stringify({
          highlights: [
            'Max DC Power: 22.5kW',
            'MPPT Voltage Range: 350-950V',
            'Max. AC Output Current: 21.7A',
            'Integrated arc fault protection',
            'Night-time power consumption: < 4W',
            'Built-in module-level monitoring',
            'Supports RS485, Ethernet, Zigbee, Wi-Fi communication'
          ],
          applications: [
            'Commercial rooftop installations',
            'Residential large-scale systems',
            'Ground-mount solar farms'
          ]
        }),
        supportedProtocols: JSON.stringify(['modbus_tcp', 'rest', 'sunspec']),
        warranty: '12 years standard, extendable to 20 or 25 years',
        price: 2899.99,
        currency: 'USD'
      },
      {
        manufacturerId: manufacturers.find(m => m.name === 'Fronius').id,
        name: 'Fronius Symo Inverter',
        modelNumber: 'Symo 10.0-3-M',
        type: 'solar_pv',
        releaseYear: 2020,
        imageUrl: '/images/devices/fronius_symo.png',
        thumbnailUrl: '/images/devices/thumbnails/fronius_symo_thumb.png',
        capacity: 10,
        maxPower: 10000,
        efficiency: 98.1,
        dimensions: '725 x 510 x 225 mm',
        weight: 34.8,
        shortDescription: 'Compact three-phase inverter with integrated data monitoring',
        fullDescription: 'The Fronius Symo is a transformerless, three-phase inverter that converts the direct current generated by solar modules into grid-compatible alternating current. It features a sophisticated design with SnapINverter technology for easy installation and SuperFlex Design for flexible configuration of solar strings.',
        features: JSON.stringify({
          highlights: [
            'Power categories from 3.0 to 20.0 kW',
            'Integrated data manager with WLAN',
            'Dynamic Peak Manager for optimal MPP tracking',
            'Smart Grid Ready',
            'Arc fault protection',
            'Multiple MPP trackers'
          ],
          applications: [
            'Commercial PV systems',
            'Residential installations',
            'Systems with multiple orientations'
          ]
        }),
        supportedProtocols: JSON.stringify(['modbus_tcp', 'sunspec']),
        warranty: '10 years standard, extendable to 20 years',
        price: 2499.99,
        currency: 'USD'
      },
      {
        manufacturerId: manufacturers.find(m => m.name === 'ABB').id,
        name: 'ABB String Inverter',
        modelNumber: 'UNO-DM-6.0-TL-PLUS',
        type: 'solar_pv',
        releaseYear: 2019,
        imageUrl: '/images/devices/abb_uno.png',
        thumbnailUrl: '/images/devices/thumbnails/abb_uno_thumb.png',
        capacity: 6,
        maxPower: 6000,
        efficiency: 97.8,
        dimensions: '553 x 418 x 175 mm',
        weight: 20.5,
        shortDescription: 'Highly efficient single-phase string inverter for residential applications',
        fullDescription: 'The ABB UNO-DM-6.0-TL-PLUS is a transformerless string inverter designed for residential PV systems. It features a dual input section to process two strings with independent MPPT, high-speed and precise MPPT algorithm for real-time power tracking and energy harvesting, and built-in connectivity for smart building integration.',
        features: JSON.stringify({
          highlights: [
            'Dual MPPT input',
            'Wide input voltage range',
            'Wireless access point for local configuration',
            'Remote monitoring capabilities',
            'Integrated DC disconnect switch',
            'Natural convection cooling'
          ],
          applications: [
            'Residential roof-top installations',
            'Small commercial applications',
            'Systems with dual orientation'
          ]
        }),
        supportedProtocols: JSON.stringify(['modbus_tcp', 'rest']),
        warranty: '10 years standard, extendable to 20 years',
        price: 1899.99,
        currency: 'USD'
      }
    ];
    
    // Define catalog entries for battery storage
    const batteryDevices = [
      {
        manufacturerId: manufacturers.find(m => m.name === 'Tesla').id,
        name: 'Tesla Powerwall',
        modelNumber: 'Powerwall 2',
        type: 'battery_storage',
        releaseYear: 2022,
        imageUrl: '/images/devices/tesla_powerwall2.png',
        thumbnailUrl: '/images/devices/thumbnails/tesla_powerwall2_thumb.png',
        capacity: 13.5,
        maxPower: 7000,
        efficiency: 90,
        dimensions: '1150 x 755 x 155 mm',
        weight: 114,
        shortDescription: 'Compact home battery system that stores solar energy for use when needed',
        fullDescription: 'The Tesla Powerwall 2 is a rechargeable lithium-ion battery stationary energy storage product manufactured by Tesla Energy. The Powerwall 2 stores electricity for solar self-consumption, time of use load shifting, backup power, and off-the-grid use. It has an energy capacity of 13.5 kWh and can deliver 7 kW peak or 5 kW continuous power.',
        features: JSON.stringify({
          highlights: [
            'Usable Capacity: 13.5 kWh',
            'Continuous Power: 5 kW',
            'Peak Power: 7 kW',
            '100% depth of discharge',
            'Water and dust resistant for indoor or outdoor installation',
            'Operating Temperature: -20°C to 50°C',
            '24/7 monitoring via Tesla app'
          ],
          applications: [
            'Residential energy storage',
            'Solar self-consumption',
            'Backup power during outages',
            'Off-grid systems'
          ]
        }),
        supportedProtocols: JSON.stringify(['modbus_tcp', 'proprietary']),
        warranty: '10 years',
        price: 8500,
        currency: 'USD'
      },
      {
        manufacturerId: manufacturers.find(m => m.name === 'LG Energy Solution').id,
        name: 'LG RESU Home Battery',
        modelNumber: 'RESU10H',
        type: 'battery_storage',
        releaseYear: 2022,
        imageUrl: '/images/devices/lg_resu10h.png',
        thumbnailUrl: '/images/devices/thumbnails/lg_resu10h_thumb.png',
        capacity: 9.8,
        maxPower: 5000,
        efficiency: 95,
        dimensions: '483 x 965 x 227 mm',
        weight: 75,
        shortDescription: 'Compact, lightweight lithium-ion battery for residential energy storage',
        fullDescription: 'The LG RESU10H Prime is a high-voltage home battery designed for solar energy storage. It features advanced lithium-ion battery cells with high energy density and long cycle life. The modular design allows for easy installation and expansion, with multi-unit operation of up to 30 kWh capacity when installed in parallel.',
        features: JSON.stringify({
          highlights: [
            'Usable Energy: 9.8 kWh',
            'Max Power Output: 5 kW',
            'Round-trip Efficiency: > 95%',
            'Expandable up to 3 units (29.4 kWh)',
            'Outdoor rated (IP55)',
            'DC-coupled system compatible with SolarEdge and SMA',
            'Integrated battery management system'
          ],
          applications: [
            'Residential solar energy storage',
            'Peak shaving',
            'Grid services',
            'Emergency backup power'
          ]
        }),
        supportedProtocols: JSON.stringify(['modbus_tcp', 'can']),
        warranty: '10 years or 60% capacity retention',
        price: 6999.99,
        currency: 'USD'
      },
      {
        manufacturerId: manufacturers.find(m => m.name === 'BYD').id,
        name: 'BYD Battery-Box Premium',
        modelNumber: 'HVS 10.2',
        type: 'battery_storage',
        releaseYear: 2021,
        imageUrl: '/images/devices/byd_batterybox.png',
        thumbnailUrl: '/images/devices/thumbnails/byd_batterybox_thumb.png',
        capacity: 10.2,
        maxPower: 5120,
        efficiency: 95.3,
        dimensions: '650 x 600 x 355 mm',
        weight: 113,
        shortDescription: 'Modular high-voltage battery system with integrated BMS',
        fullDescription: 'The BYD Battery-Box Premium HVS is a high-voltage lithium iron phosphate (LFP) battery system designed for residential and small commercial applications. The modular design allows for flexible capacity configurations from 5.1 to 15.4 kWh. BYD\'s proprietary technology ensures high efficiency, safety, and long service life.',
        features: JSON.stringify({
          highlights: [
            'Usable Energy: 10.2 kWh',
            'Max Power: 5.12 kW',
            'Lithium Iron Phosphate (LFP) battery chemistry',
            'No cobalt, high safety',
            'Modular design with stackable battery modules',
            'IP55 protection class',
            'Compatible with multiple inverter brands'
          ],
          applications: [
            'Residential energy storage',
            'Commercial building optimization',
            'Off-grid applications',
            'Solar self-consumption'
          ]
        }),
        supportedProtocols: JSON.stringify(['modbus_tcp', 'can']),
        warranty: '10 years or 70% capacity retention',
        price: 6299.99,
        currency: 'USD'
      }
    ];
    
    // Define catalog entries for EV chargers
    const evChargerDevices = [
      {
        manufacturerId: manufacturers.find(m => m.name === 'ChargePoint').id,
        name: 'ChargePoint Home Flex',
        modelNumber: 'CPH50',
        type: 'ev_charger',
        releaseYear: 2022,
        imageUrl: '/images/devices/chargepoint_flex.png',
        thumbnailUrl: '/images/devices/thumbnails/chargepoint_flex_thumb.png',
        capacity: null,
        maxPower: 12000,
        efficiency: 94,
        dimensions: '330 x 178 x 89 mm',
        weight: 5.67,
        shortDescription: 'Flexible home EV charging station with WiFi connectivity',
        fullDescription: 'The ChargePoint Home Flex is a Level 2 electric vehicle charging station that delivers up to 50 amps of power. It can be installed indoors or outdoors and connects to WiFi for intelligent charging control through the ChargePoint app. The flexible amperage settings allow for customized charging speeds based on your home\'s electrical capacity.',
        features: JSON.stringify({
          highlights: [
            'Adjustable output from 16A to 50A',
            'Up to 37 miles of range per hour of charging',
            'WiFi enabled for remote control',
            'Energy monitoring via smartphone app',
            'Schedule charging during off-peak hours',
            'Universal J1772 connector works with all EVs',
            'ENERGY STAR certified for efficiency'
          ],
          applications: [
            'Residential EV charging',
            'Flexible installation options',
            'Smart home integration',
            'Utility demand response programs'
          ]
        }),
        supportedProtocols: JSON.stringify(['ocpp', 'mqtt', 'rest']),
        warranty: '3 years',
        price: 699,
        currency: 'USD'
      },
      {
        manufacturerId: manufacturers.find(m => m.name === 'Tesla').id,
        name: 'Tesla Wall Connector',
        modelNumber: 'Gen 3',
        type: 'ev_charger',
        releaseYear: 2021,
        imageUrl: '/images/devices/tesla_wallconnector.png',
        thumbnailUrl: '/images/devices/thumbnails/tesla_wallconnector_thumb.png',
        capacity: null,
        maxPower: 11500,
        efficiency: 95,
        dimensions: '380 x 160 x 140 mm',
        weight: 6.8,
        shortDescription: 'Smart home charging solution for Tesla vehicles',
        fullDescription: 'The Tesla Wall Connector Gen 3 is a home charging solution designed to charge Tesla vehicles rapidly and efficiently. With WiFi connectivity, over-the-air updates, and power sharing capability, it offers a convenient and future-proof charging experience. It can deliver up to 48 amps of power, adding up to 44 miles of range per hour of charging.',
        features: JSON.stringify({
          highlights: [
            'Up to 48A output / 11.5 kW',
            'WiFi enabled for updates and monitoring',
            'Power sharing (up to 4 Wall Connectors)',
            'Indoor/outdoor rated (NEMA 3R)',
            'Multiple mounting options',
            '24-foot cable length',
            'LED status indicator'
          ],
          applications: [
            'Tesla vehicle charging',
            'Residential garages',
            'Outdoor parking areas',
            'Multi-unit dwellings with power sharing'
          ]
        }),
        supportedProtocols: JSON.stringify(['proprietary', 'mqtt']),
        warranty: '4 years',
        price: 550,
        currency: 'USD'
      },
      {
        manufacturerId: manufacturers.find(m => m.name === 'ABB').id,
        name: 'ABB Terra AC Wallbox',
        modelNumber: 'Terra AC W11-G5-R-0',
        type: 'ev_charger',
        releaseYear: 2022,
        imageUrl: '/images/devices/abb_terra.png',
        thumbnailUrl: '/images/devices/thumbnails/abb_terra_thumb.png',
        capacity: null,
        maxPower: 22000,
        efficiency: 95,
        dimensions: '320 x 195 x 110 mm',
        weight: 4.5,
        shortDescription: 'High-performance commercial and residential EV charger',
        fullDescription: 'The ABB Terra AC Wallbox is a versatile electric vehicle charging solution suitable for homes, workplaces, and commercial settings. It offers reliable, cost-effective EV charging with the latest safety features and connectivity options. The intuitive interface and future-proof design ensure an excellent user experience and long service life.',
        features: JSON.stringify({
          highlights: [
            'Adjustable power from 3.7 to 22 kW',
            'RFID authentication option',
            'Ethernet, WiFi, 4G connectivity',
            'OCPP 1.6 compatible',
            'Load balancing capability',
            'MID-certified energy meter',
            'Compact, modular design for easy installation'
          ],
          applications: [
            'Residential charging',
            'Workplace and commercial sites',
            'Fleet management',
            'Public charging stations'
          ]
        }),
        supportedProtocols: JSON.stringify(['ocpp', 'modbus_tcp', 'rest']),
        warranty: '2 years',
        price: 1299,
        currency: 'USD'
      }
    ];
    
    // Define catalog entries for smart meters
    const smartMeterDevices = [
      {
        manufacturerId: manufacturers.find(m => m.name === 'Schneider Electric').id,
        name: 'Schneider PowerLogic',
        modelNumber: 'PM5563',
        type: 'smart_meter',
        releaseYear: 2022,
        imageUrl: '/images/devices/schneider_powerlogic.png',
        thumbnailUrl: '/images/devices/thumbnails/schneider_powerlogic_thumb.png',
        capacity: null,
        maxPower: null,
        efficiency: null,
        dimensions: '96 x 96 x 77 mm',
        weight: 0.37,
        shortDescription: 'Advanced power meter for electrical distribution systems',
        fullDescription: 'The Schneider PowerLogic PM5563 is a comprehensive power monitoring device designed for critical power applications. It offers high-precision energy metering, power quality analysis, and extensive communication capabilities. It helps facility managers optimize energy usage, reduce costs, and ensure reliable electrical system operation.',
        features: JSON.stringify({
          highlights: [
            'Class 0.2S energy accuracy',
            'Multi-function 3-phase power measurement',
            'Power quality monitoring',
            'Harmonics measurement up to 63rd order',
            'Ethernet, RS-485 communication',
            'Multiple tariff management',
            'On-board data logging'
          ],
          applications: [
            'Commercial and industrial buildings',
            'Data centers',
            'Healthcare facilities',
            'Manufacturing plants',
            'Energy management systems'
          ]
        }),
        supportedProtocols: JSON.stringify(['modbus_tcp', 'modbus_rtu', 'sunspec']),
        warranty: '5 years',
        price: 1850,
        currency: 'USD'
      },
      {
        manufacturerId: manufacturers.find(m => m.name === 'ABB').id,
        name: 'ABB Energy Meter',
        modelNumber: 'B23 212-100',
        type: 'smart_meter',
        releaseYear: 2021,
        imageUrl: '/images/devices/abb_b23.png',
        thumbnailUrl: '/images/devices/thumbnails/abb_b23_thumb.png',
        capacity: null,
        maxPower: null,
        efficiency: null,
        dimensions: '96 x 96 x 69 mm',
        weight: 0.4,
        shortDescription: 'Compact digital power meter for electrical installations',
        fullDescription: 'The ABB B23 Energy Meter is a digital power measuring device designed for monitoring electrical parameters in distribution panels. It measures power, energy, current, voltage, frequency and other electrical parameters with high accuracy. Its compact design and simple interface make it ideal for retrofit applications and new installations.',
        features: JSON.stringify({
          highlights: [
            'Class 1 energy measurement',
            'True RMS measurements',
            'LCD display with backlight',
            'Single and three-phase monitoring',
            'RS-485 communication port',
            'Four-quadrant energy measurement',
            'DIN-rail mounting option'
          ],
          applications: [
            'Energy consumption monitoring',
            'Cost allocation',
            'Load profiling',
            'Building management systems',
            'Small to medium commercial buildings'
          ]
        }),
        supportedProtocols: JSON.stringify(['modbus_rtu', 'modbus_tcp']),
        warranty: '3 years',
        price: 385,
        currency: 'USD'
      },
      {
        manufacturerId: manufacturers.find(m => m.name === 'Schneider Electric').id,
        name: 'Schneider Acti9 iEM3000',
        modelNumber: 'iEM3255',
        type: 'smart_meter',
        releaseYear: 2020,
        imageUrl: '/images/devices/schneider_iem3255.png',
        thumbnailUrl: '/images/devices/thumbnails/schneider_iem3255_thumb.png',
        capacity: null,
        maxPower: null,
        efficiency: null,
        dimensions: '72 x 94.5 x 66.5 mm',
        weight: 0.3,
        shortDescription: 'DIN-rail mounted energy meter for electrical distribution systems',
        fullDescription: 'The Schneider Acti9 iEM3255 is a compact DIN-rail mounted energy meter designed for sub-billing and energy cost allocation. It provides accurate energy metering and multi-tariff capability for comprehensive energy monitoring. Its communication options enable integration with energy management systems.',
        features: JSON.stringify({
          highlights: [
            'Class 0.5S IEC 62053-22 energy accuracy',
            'Active and reactive energy measurement',
            'Four-quadrant metering',
            'Multiple tariff registers',
            'Modbus communication',
            'MID-approved for billing applications',
            'Pulse outputs for energy pulsing'
          ],
          applications: [
            'Tenant sub-billing',
            'Energy cost allocation',
            'Monitoring of electrical installations',
            'Integration with building management systems',
            'Energy efficiency programs'
          ]
        }),
        supportedProtocols: JSON.stringify(['modbus_rtu']),
        warranty: '2 years',
        price: 295,
        currency: 'USD'
      }
    ];
    
    // Define catalog entries for heat pumps
    const heatPumpDevices = [
      {
        manufacturerId: manufacturers.find(m => m.name === 'Daikin').id,
        name: 'Daikin Altherma 3',
        modelNumber: 'EHVX08S23D6V',
        type: 'heat_pump',
        releaseYear: 2023,
        imageUrl: '/images/devices/daikin_altherma3.png',
        thumbnailUrl: '/images/devices/thumbnails/daikin_altherma3_thumb.png',
        capacity: 8,
        maxPower: 2200,
        efficiency: 5.3, // SCOP value
        dimensions: '1650 x 595 x 625 mm',
        weight: 146,
        shortDescription: 'High-efficiency reversible air-to-water heat pump for heating, cooling and domestic hot water',
        fullDescription: 'The Daikin Altherma 3 is an advanced air-to-water heat pump system that delivers heating, cooling, and domestic hot water with exceptional efficiency. It uses R-32 refrigerant with lower global warming potential and features Daikin\'s Bluevolution technology for improved performance and reduced environmental impact. The intuitive user interface ensures easy operation and energy tracking.',
        features: JSON.stringify({
          highlights: [
            'Heating capacity: 8 kW',
            'Energy efficiency class A+++',
            'SCOP up to 5.3',
            'Domestic hot water tank: 230L',
            'Built-in backup heater: 6 kW',
            'Operating range: -28°C to 35°C',
            'Intelligent Thermal Grid control',
            'Compatible with Daikin Onecta app'
          ],
          applications: [
            'Residential space heating',
            'Space cooling',
            'Domestic hot water production',
            'Integration with solar thermal systems',
            'Smart grid applications'
          ]
        }),
        supportedProtocols: JSON.stringify(['modbus_tcp', 'mqtt']),
        warranty: '5 years',
        price: 10999,
        currency: 'EUR'
      },
      {
        manufacturerId: manufacturers.find(m => m.name === 'Mitsubishi Electric').id,
        name: 'Mitsubishi Ecodan',
        modelNumber: 'PUZ-HWM140YHA',
        type: 'heat_pump',
        releaseYear: 2022,
        imageUrl: '/images/devices/mitsubishi_ecodan.png',
        thumbnailUrl: '/images/devices/thumbnails/mitsubishi_ecodan_thumb.png',
        capacity: 14,
        maxPower: 3500,
        efficiency: 4.8, // SCOP value
        dimensions: '1020 x 1050 x 480 mm (outdoor unit)',
        weight: 124,
        shortDescription: 'High-performance air-source heat pump for residential heating and hot water',
        fullDescription: 'The Mitsubishi Ecodan is a reliable and efficient air-source heat pump system designed for residential applications. It provides space heating and domestic hot water with exceptional performance even in cold climates. The system uses advanced inverter technology to maximize efficiency and minimize energy consumption, making it an environmentally friendly heating solution.',
        features: JSON.stringify({
          highlights: [
            'Heating capacity: 14 kW',
            'Energy efficiency class A++',
            'SCOP up to 4.8',
            'Low-noise operation mode',
            'Weather compensation control',
            'Operating range down to -20°C',
            'MELCloud connectivity for remote control',
            'Flow temperature up to 60°C'
          ],
          applications: [
            'Residential space heating',
            'Domestic hot water production',
            'Retrofit installations',
            'New build projects',
            'Hybrid heating systems'
          ]
        }),
        supportedProtocols: JSON.stringify(['modbus_tcp', 'proprietary']),
        warranty: '7 years when installed by an approved installer',
        price: 9999,
        currency: 'EUR'
      },
      {
        manufacturerId: manufacturers.find(m => m.name === 'Daikin').id,
        name: 'Daikin VRV IV Heat Recovery',
        modelNumber: 'REYQ14T',
        type: 'heat_pump',
        releaseYear: 2021,
        imageUrl: '/images/devices/daikin_vrv4.png',
        thumbnailUrl: '/images/devices/thumbnails/daikin_vrv4_thumb.png',
        capacity: 40,
        maxPower: 12500,
        efficiency: 6.4, // EER value
        dimensions: '1685 x 1240 x 765 mm',
        weight: 314,
        shortDescription: 'Commercial VRF system with heat recovery for large buildings',
        fullDescription: 'The Daikin VRV IV Heat Recovery system is a premium commercial heating, cooling, and hot water solution for large buildings. It allows simultaneous heating and cooling from different indoor units connected to the same refrigerant circuit, providing maximum comfort and efficiency. The system recovers heat from areas requiring cooling and transfers it to areas requiring heating or hot water, drastically reducing energy consumption.',
        features: JSON.stringify({
          highlights: [
            'Cooling capacity: 40 kW',
            'Heating capacity: 45 kW',
            'Simultaneous heating and cooling operation',
            'Variable Refrigerant Temperature control',
            'Continuous heating during defrost',
            'Up to 64 indoor units per system',
            'Intelligent Touch Manager compatible',
            'Heat recovery for hot water production'
          ],
          applications: [
            'Office buildings',
            'Hotels',
            'Hospitals',
            'Retail environments',
            'Mixed-use buildings'
          ]
        }),
        supportedProtocols: JSON.stringify(['bacnet', 'modbus_tcp', 'lonworks']),
        warranty: '3 years',
        price: 35500,
        currency: 'EUR'
      }
    ];
    
    // Combine all device types
    const allDevices = [...solarDevices, ...batteryDevices, ...evChargerDevices, ...smartMeterDevices, ...heatPumpDevices];
    
    // Insert devices into catalog
    console.log('Inserting devices into catalog...');
    for (const device of allDevices) {
      // First check if this device already exists
      const checkResult = await pool.query(
        `SELECT id FROM device_catalog WHERE manufacturer_id = $1 AND model_number = $2`,
        [device.manufacturerId, device.modelNumber]
      );
      
      let result;
      if (checkResult.rows.length > 0) {
        // Update existing device
        device.id = checkResult.rows[0].id;
        await pool.query(
          `UPDATE device_catalog SET
             name = $2,
             type = $3,
             release_year = $4,
             image_url = $5,
             thumbnail_url = $6,
             capacity = $7,
             max_power = $8,
             efficiency = $9,
             dimensions = $10,
             weight = $11,
             short_description = $12,
             full_description = $13,
             features = $14,
             supported_protocols = $15,
             warranty = $16,
             price = $17,
             currency = $18
           WHERE id = $1`,
          [
            device.id,
            device.name,
            device.type,
            device.releaseYear,
            device.imageUrl,
            device.thumbnailUrl,
            device.capacity,
            device.maxPower,
            device.efficiency,
            device.dimensions,
            device.weight,
            device.shortDescription,
            device.fullDescription,
            device.features,
            device.supportedProtocols,
            device.warranty,
            device.price,
            device.currency
          ]
        );
        console.log(`Device ${device.name} (${device.modelNumber}) updated with ID ${device.id}`);
      } else {
        // Insert new device
        result = await pool.query(
          `INSERT INTO device_catalog 
           (manufacturer_id, name, model_number, type, release_year, image_url, thumbnail_url, 
            capacity, max_power, efficiency, dimensions, weight, short_description, full_description,
            features, supported_protocols, warranty, price, currency) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           RETURNING id`,
        [
          device.manufacturerId,
          device.name,
          device.modelNumber,
          device.type,
          device.releaseYear,
          device.imageUrl,
          device.thumbnailUrl,
          device.capacity,
          device.maxPower,
          device.efficiency,
          device.dimensions,
          device.weight,
          device.shortDescription,
          device.fullDescription,
          device.features,
          device.supportedProtocols,
          device.warranty,
          device.price,
          device.currency
        ]);
        
        device.id = result.rows[0].id;
        console.log(`Device ${device.name} (${device.modelNumber}) inserted with ID ${device.id}`);
      }
    }
    
    // Define documents for devices
    const documents = [
      {
        deviceCatalogId: solarDevices[0].id,
        documentType: 'manual',
        title: 'SolarEdge SE15K Installation Manual',
        fileUrl: '/documents/solaredge_se15k_installation_manual.pdf',
        fileSize: 3450000,
        language: 'en',
        version: '1.2',
        description: 'Comprehensive installation guide for the SolarEdge SE15K three-phase inverter.'
      },
      {
        deviceCatalogId: solarDevices[0].id,
        documentType: 'datasheet',
        title: 'SolarEdge SE15K Technical Specifications',
        fileUrl: '/documents/solaredge_se15k_datasheet.pdf',
        fileSize: 1250000,
        language: 'en',
        version: '2.1',
        description: 'Technical specifications and performance parameters for the SolarEdge SE15K inverter.'
      },
      {
        deviceCatalogId: batteryDevices[0].id,
        documentType: 'manual',
        title: 'Tesla Powerwall 2 Owner\'s Manual',
        fileUrl: '/documents/tesla_powerwall2_owners_manual.pdf',
        fileSize: 4250000,
        language: 'en',
        version: '3.0',
        description: 'Owner\'s manual for the Tesla Powerwall 2 home battery system.'
      },
      {
        deviceCatalogId: batteryDevices[0].id,
        documentType: 'datasheet',
        title: 'Tesla Powerwall 2 Datasheet',
        fileUrl: '/documents/tesla_powerwall2_datasheet.pdf',
        fileSize: 980000,
        language: 'en',
        version: '2.2',
        description: 'Technical specifications for the Tesla Powerwall 2 battery system.'
      }
    ];
    
    // Insert documents
    console.log('Inserting documents...');
    for (const document of documents) {
      await pool.query(
        `INSERT INTO device_catalog_documents 
         (device_catalog_id, document_type, title, file_url, file_size, language, version, description) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          document.deviceCatalogId,
          document.documentType,
          document.title,
          document.fileUrl,
          document.fileSize,
          document.language,
          document.version,
          document.description
        ]
      );
      
      console.log(`Document "${document.title}" inserted for device ID ${document.deviceCatalogId}`);
    }
    
    // Define registers for devices
    const registers = [
      {
        deviceCatalogId: solarDevices[0].id,
        protocol: 'modbus_tcp',
        address: '40001',
        name: 'AC Current',
        description: 'Current output from the inverter',
        dataType: 'float',
        unit: 'A',
        scaleFactor: 0.1,
        offsetValue: 0,
        minValue: 0,
        maxValue: 50,
        access: 'read',
        isRequired: true,
        defaultValue: null,
        notes: 'Scaling: value = register * 0.1'
      },
      {
        deviceCatalogId: solarDevices[0].id,
        protocol: 'modbus_tcp',
        address: '40003',
        name: 'AC Voltage',
        description: 'Line voltage',
        dataType: 'float',
        unit: 'V',
        scaleFactor: 0.1,
        offsetValue: 0,
        minValue: 0,
        maxValue: 500,
        access: 'read',
        isRequired: true,
        defaultValue: null,
        notes: 'Scaling: value = register * 0.1'
      },
      {
        deviceCatalogId: solarDevices[0].id,
        protocol: 'modbus_tcp',
        address: '40005',
        name: 'AC Power',
        description: 'Current output power',
        dataType: 'float',
        unit: 'W',
        scaleFactor: 1,
        offsetValue: 0,
        minValue: 0,
        maxValue: 15000,
        access: 'read',
        isRequired: true,
        defaultValue: null,
        notes: null
      },
      {
        deviceCatalogId: batteryDevices[0].id,
        protocol: 'modbus_tcp',
        address: '40001',
        name: 'State of Charge',
        description: 'Battery state of charge',
        dataType: 'float',
        unit: '%',
        scaleFactor: 0.1,
        offsetValue: 0,
        minValue: 0,
        maxValue: 100,
        access: 'read',
        isRequired: true,
        defaultValue: null,
        notes: 'Scaling: value = register * 0.1'
      },
      {
        deviceCatalogId: batteryDevices[0].id,
        protocol: 'modbus_tcp',
        address: '40003',
        name: 'Battery Power',
        description: 'Current battery power (positive for discharge, negative for charge)',
        dataType: 'float',
        unit: 'W',
        scaleFactor: 1,
        offsetValue: 0,
        minValue: -7000,
        maxValue: 7000,
        access: 'read',
        isRequired: true,
        defaultValue: null,
        notes: 'Positive values indicate discharge, negative values indicate charge'
      }
    ];
    
    // Insert registers
    console.log('Inserting registers...');
    for (const register of registers) {
      await pool.query(
        `INSERT INTO device_catalog_registers 
         (device_catalog_id, protocol, address, name, description, data_type, unit, 
          scale_factor, offset_value, min_value, max_value, access, is_required, default_value, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          register.deviceCatalogId,
          register.protocol,
          register.address,
          register.name,
          register.description,
          register.dataType,
          register.unit,
          register.scaleFactor,
          register.offsetValue,
          register.minValue,
          register.maxValue,
          register.access,
          register.isRequired,
          register.defaultValue,
          register.notes
        ]
      );
      
      console.log(`Register "${register.name}" inserted for device ID ${register.deviceCatalogId}`);
    }
    
    // Define presets for devices
    const presets = [
      {
        deviceCatalogId: solarDevices[0].id,
        name: 'Standard Configuration',
        description: 'Default settings for most residential installations',
        configValues: JSON.stringify({
          maxExportPower: 15000,
          reactiveMode: 'CosPhi',
          cosPhiValue: 1.0,
          powerLimit: 100,
          energyManagerMode: 'Self Consumption'
        }),
        isDefault: true
      },
      {
        deviceCatalogId: solarDevices[0].id,
        name: 'Grid Friendly',
        description: 'Settings optimized for grid stability',
        configValues: JSON.stringify({
          maxExportPower: 13500,
          reactiveMode: 'Q(U)',
          v1: 207,
          v2: 220,
          v3: 230,
          v4: 253,
          q1: 0.6,
          q2: 0,
          q3: 0,
          q4: -0.6,
          powerLimit: 90,
          energyManagerMode: 'Grid Support'
        }),
        isDefault: false
      },
      {
        deviceCatalogId: batteryDevices[0].id,
        name: 'Backup Reserve',
        description: 'Settings optimized for backup power during outages',
        configValues: JSON.stringify({
          backupReserve: 30,
          chargingMode: 'Balanced',
          timeBased: false,
          stormWatch: true,
          exportLimit: 0
        }),
        isDefault: true
      },
      {
        deviceCatalogId: batteryDevices[0].id,
        name: 'Self-Consumption',
        description: 'Settings optimized for maximizing self-consumption',
        configValues: JSON.stringify({
          backupReserve: 20,
          chargingMode: 'Self-Powered',
          timeBased: false,
          stormWatch: false,
          exportLimit: 0
        }),
        isDefault: false
      }
    ];
    
    // Insert presets
    console.log('Inserting presets...');
    for (const preset of presets) {
      await pool.query(
        `INSERT INTO device_catalog_presets 
         (device_catalog_id, name, description, config_values, is_default) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          preset.deviceCatalogId,
          preset.name,
          preset.description,
          preset.configValues,
          preset.isDefault
        ]
      );
      
      console.log(`Preset "${preset.name}" inserted for device ID ${preset.deviceCatalogId}`);
    }
    
    console.log('Device catalog seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding device catalog:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seedDeviceCatalog();