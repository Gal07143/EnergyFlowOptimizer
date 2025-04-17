import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

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
    
    // Define documents for devices
    const documents = [
      {
        deviceKey: 'SolarEdge-SE15K',
        documentType: 'manual',
        title: 'SolarEdge SE15K Installation Manual',
        fileUrl: '/documents/solaredge_se15k_installation_manual.pdf',
        fileSize: 3450000,
        language: 'en',
        version: '1.2',
        description: 'Comprehensive installation guide for the SolarEdge SE15K three-phase inverter.'
      },
      {
        deviceKey: 'SolarEdge-SE15K',
        documentType: 'datasheet',
        title: 'SolarEdge SE15K Technical Specifications',
        fileUrl: '/documents/solaredge_se15k_datasheet.pdf',
        fileSize: 1250000,
        language: 'en',
        version: '2.1',
        description: 'Technical specifications and performance parameters for the SolarEdge SE15K inverter.'
      },
      {
        deviceKey: 'Tesla-Powerwall 2',
        documentType: 'manual',
        title: 'Tesla Powerwall 2 Owner\'s Manual',
        fileUrl: '/documents/tesla_powerwall2_owners_manual.pdf',
        fileSize: 4250000,
        language: 'en',
        version: '3.0',
        description: 'Owner\'s manual for the Tesla Powerwall 2 home battery system.'
      }
    ];
    
    // Insert documents
    console.log('Inserting documents...');
    for (const document of documents) {
      const deviceId = deviceIds[document.deviceKey];
      
      if (!deviceId) {
        console.error(`Device not found for document ${document.title}`);
        continue;
      }
      
      // Check if document already exists
      const checkResult = await pool.query(
        `SELECT id FROM device_catalog_documents 
         WHERE device_catalog_id = $1 AND document_type = $2 AND title = $3`,
        [deviceId, document.documentType, document.title]
      );
      
      if (checkResult.rows.length > 0) {
        // Document exists, skip or update as needed
        console.log(`Document "${document.title}" already exists, skipping`);
        continue;
      }
      
      await pool.query(
        `INSERT INTO device_catalog_documents 
         (device_catalog_id, document_type, title, file_url, file_size, language, version, description) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          deviceId,
          document.documentType,
          document.title,
          document.fileUrl,
          document.fileSize,
          document.language,
          document.version,
          document.description
        ]
      );
      
      console.log(`Document "${document.title}" inserted for device ID ${deviceId}`);
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
        deviceKey: 'SolarEdge-SE15K',
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
      const checkResult = await pool.query(
        `SELECT id FROM device_catalog_registers 
         WHERE device_catalog_id = $1 AND protocol = $2 AND address = $3`,
        [deviceId, register.protocol, register.address]
      );
      
      if (checkResult.rows.length > 0) {
        // Register exists, skip or update as needed
        console.log(`Register "${register.name}" already exists, skipping`);
        continue;
      }
      
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
    
    // Define presets for devices
    const presets = [
      {
        deviceKey: 'SolarEdge-SE15K',
        name: 'Standard Configuration',
        description: 'Default settings for most residential installations',
        configValues: {
          maxExportPower: 15000,
          reactiveMode: 'CosPhi',
          cosPhiValue: 1.0,
          powerLimit: 100,
          energyManagerMode: 'Self Consumption'
        },
        isDefault: true
      },
      {
        deviceKey: 'Tesla-Powerwall 2',
        name: 'Backup Reserve',
        description: 'Settings optimized for backup power during outages',
        configValues: {
          backupReserve: 30,
          chargingMode: 'Balanced',
          timeBased: false,
          stormWatch: true,
          exportLimit: 0
        },
        isDefault: true
      }
    ];
    
    // Insert presets
    console.log('Inserting presets...');
    for (const preset of presets) {
      const deviceId = deviceIds[preset.deviceKey];
      
      if (!deviceId) {
        console.error(`Device not found for preset ${preset.name}`);
        continue;
      }
      
      // Check if preset already exists
      const checkResult = await pool.query(
        `SELECT id FROM device_catalog_presets 
         WHERE device_catalog_id = $1 AND name = $2`,
        [deviceId, preset.name]
      );
      
      if (checkResult.rows.length > 0) {
        // Preset exists, skip or update as needed
        console.log(`Preset "${preset.name}" already exists, skipping`);
        continue;
      }
      
      await pool.query(
        `INSERT INTO device_catalog_presets 
         (device_catalog_id, name, description, config_values, is_default) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          deviceId,
          preset.name,
          preset.description,
          JSON.stringify(preset.configValues),
          preset.isDefault
        ]
      );
      
      console.log(`Preset "${preset.name}" inserted for device ID ${deviceId}`);
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