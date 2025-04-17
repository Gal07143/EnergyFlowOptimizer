const { Pool } = require('pg');
require('dotenv').config();

async function seedDeviceCatalog() {
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
    const manufacturerIds = {};
    
    for (const manufacturer of manufacturers) {
      // Check if manufacturer exists
      const checkResult = await pool.query(
        `SELECT id FROM device_manufacturers WHERE name = $1`,
        [manufacturer.name]
      );
      
      let manufacturerId;
      
      if (checkResult.rows.length > 0) {
        // Manufacturer exists, update it
        manufacturerId = checkResult.rows[0].id;
        await pool.query(
          `UPDATE device_manufacturers SET
            logo_url = $2,
            website = $3,
            country = $4,
            description = $5,
            contact_email = $6,
            contact_phone = $7,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [
            manufacturerId,
            manufacturer.logoUrl,
            manufacturer.website,
            manufacturer.country,
            manufacturer.description,
            manufacturer.contactEmail,
            manufacturer.contactPhone
          ]
        );
        console.log(`Manufacturer ${manufacturer.name} updated with ID ${manufacturerId}`);
      } else {
        // Insert new manufacturer
        const result = await pool.query(
          `INSERT INTO device_manufacturers 
           (name, logo_url, website, country, description, contact_email, contact_phone) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)
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
        
        manufacturerId = result.rows[0].id;
        console.log(`Manufacturer ${manufacturer.name} inserted with ID ${manufacturerId}`);
      }
      
      manufacturerIds[manufacturer.name] = manufacturerId;
    }
    
    // Define catalog entries for solar PV
    const solarDevices = [
      {
        manufacturerName: 'SolarEdge',
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
        features: {
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
        },
        supportedProtocols: ['modbus_tcp', 'rest', 'sunspec'],
        warranty: '12 years standard, extendable to 20 or 25 years',
        price: 2899.99,
        currency: 'USD'
      },
      {
        manufacturerName: 'Fronius',
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
        features: {
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
        },
        supportedProtocols: ['modbus_tcp', 'sunspec'],
        warranty: '10 years standard, extendable to 20 years',
        price: 2499.99,
        currency: 'USD'
      },
      {
        manufacturerName: 'ABB',
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
        features: {
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
        },
        supportedProtocols: ['modbus_tcp', 'rest'],
        warranty: '10 years standard, extendable to 20 years',
        price: 1899.99,
        currency: 'USD'
      }
    ];
    
    // Define catalog entries for battery storage
    const batteryDevices = [
      {
        manufacturerName: 'Tesla',
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
        features: {
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
        },
        supportedProtocols: ['modbus_tcp', 'proprietary'],
        warranty: '10 years',
        price: 8500,
        currency: 'USD'
      }
    ];
    
    // Combine all device types
    const allDevices = [...solarDevices, ...batteryDevices];
    
    // Insert devices into catalog
    console.log('Inserting devices into catalog...');
    const deviceIds = {};
    
    for (const device of allDevices) {
      const manufacturerId = manufacturerIds[device.manufacturerName];
      
      if (!manufacturerId) {
        console.error(`Manufacturer not found for ${device.name}`);
        continue;
      }
      
      // Check if device exists
      const checkResult = await pool.query(
        `SELECT id FROM device_catalog WHERE manufacturer_id = $1 AND model_number = $2`,
        [manufacturerId, device.modelNumber]
      );
      
      let deviceId;
      
      if (checkResult.rows.length > 0) {
        // Device exists, update it
        deviceId = checkResult.rows[0].id;
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
             currency = $18,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [
            deviceId,
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
            JSON.stringify(device.features),
            JSON.stringify(device.supportedProtocols),
            device.warranty,
            device.price,
            device.currency
          ]
        );
        console.log(`Device ${device.name} (${device.modelNumber}) updated with ID ${deviceId}`);
      } else {
        // Insert new device
        const result = await pool.query(
          `INSERT INTO device_catalog 
           (manufacturer_id, name, model_number, type, release_year, image_url, thumbnail_url, 
            capacity, max_power, efficiency, dimensions, weight, short_description, full_description,
            features, supported_protocols, warranty, price, currency) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           RETURNING id`,
          [
            manufacturerId,
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
            JSON.stringify(device.features),
            JSON.stringify(device.supportedProtocols),
            device.warranty,
            device.price,
            device.currency
          ]
        );
        
        deviceId = result.rows[0].id;
        console.log(`Device ${device.name} (${device.modelNumber}) inserted with ID ${deviceId}`);
      }
      
      deviceIds[`${device.manufacturerName}-${device.modelNumber}`] = deviceId;
    }
    
    // Define registers for devices
    const registers = [
      {
        deviceKey: 'SolarEdge-SE15K',
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
        deviceKey: 'Tesla-Powerwall 2',
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
      }
    ];
    
    // Insert registers
    console.log('Inserting registers...');
    for (const register of registers) {
      const deviceId = deviceIds[register.deviceKey];
      
      if (!deviceId) {
        console.error(`Device not found for register ${register.name}`);
        continue;
      }
      
      // Check if register already exists
      const checkRegisterResult = await pool.query(
        `SELECT id FROM device_catalog_registers 
         WHERE device_catalog_id = $1 AND protocol = $2 AND address = $3`,
        [deviceId, register.protocol, register.address]
      );
      
      if (checkRegisterResult.rows.length > 0) {
        // Register exists, skip
        console.log(`Register "${register.name}" already exists, skipping`);
      } else {
        // Insert new register
        await pool.query(
          `INSERT INTO device_catalog_registers 
           (device_catalog_id, protocol, address, name, description, data_type, unit, 
            scale_factor, offset_value, min_value, max_value, access, is_required, default_value, notes) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            deviceId,
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
        
        console.log(`Register "${register.name}" inserted for device ID ${deviceId}`);
      }
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