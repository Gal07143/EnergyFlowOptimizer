/**
 * Device Catalog Seed Script for Energy Management System
 * 
 * This script populates the database with real device data including:
 * - Manufacturers with company details
 * - Device models with detailed specifications
 * - Technical specifications for different device types
 * - Configuration presets for devices
 */

import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';
import { 
  deviceManufacturers, 
  deviceCatalog, 
  deviceTechnicalSpecs,
  deviceCatalogPresets
} from './shared/schema.ts';

async function seedDeviceData() {
  console.log('Starting device data seeding...');
  
  try {
    // Insert manufacturers
    const manufacturerData = await seedManufacturers();
    console.log(`✅ Successfully inserted ${manufacturerData.length} manufacturers`);
    
    // Insert device catalog entries
    const deviceCatalogData = await seedDeviceCatalog(manufacturerData);
    console.log(`✅ Successfully inserted ${deviceCatalogData.length} device models`);
    
    // Insert technical specifications for devices
    const techSpecsData = await seedTechnicalSpecs(deviceCatalogData);
    console.log(`✅ Successfully inserted technical specifications for ${techSpecsData.length} devices`);
    
    // Insert configuration presets
    const presetsData = await seedConfigurationPresets(deviceCatalogData);
    console.log(`✅ Successfully inserted ${presetsData.length} configuration presets`);
    
    console.log('✅ Device data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding device data:', error);
    throw error;
  }
}

/**
 * Seed real manufacturers data
 */
async function seedManufacturers() {
  console.log('Seeding manufacturers...');
  
  // First, get existing manufacturers to avoid duplication
  const existingManufacturers = await db.select().from(deviceManufacturers);
  const existingManufacturerNames = new Set(existingManufacturers.map(m => m.name));
  
  console.log(`Found ${existingManufacturers.length} existing manufacturers in the database`);
  
  const manufacturers = [
    // Solar Inverter Manufacturers
    {
      name: 'SMA Solar Technology',
      logoUrl: 'https://www.sma.de/fileadmin/content/global/news_pics/SMA.png',
      website: 'https://www.sma-solar.com',
      country: 'Germany',
      description: 'Leading global specialist in photovoltaic system technology',
      contactEmail: 'info@sma.de',
      contactPhone: '+49 561 9522-0'
    },
    {
      name: 'Fronius International',
      logoUrl: 'https://www.fronius.com/~/downloads/Solar%20Energy/Images/SE_Logo_Fronius.jpg',
      website: 'https://www.fronius.com',
      country: 'Austria',
      description: 'Manufacturer of high-quality inverters for photovoltaic systems',
      contactEmail: 'contact@fronius.com',
      contactPhone: '+43 7242 241-0'
    },
    {
      name: 'SolarEdge Technologies',
      logoUrl: 'https://www.solaredge.com/sites/default/files/solaredge-logo.png',
      website: 'https://www.solaredge.com',
      country: 'Israel',
      description: 'Provider of power optimizer, solar inverter and monitoring solutions',
      contactEmail: 'info@solaredge.com',
      contactPhone: '+972 7309 77777'
    },
    {
      name: 'Huawei Technologies',
      logoUrl: 'https://www.huawei.com/-/media/corporate/images/home/logo/huawei_logo.png',
      website: 'https://solar.huawei.com',
      country: 'China',
      description: 'Global leading smart PV solution provider',
      contactEmail: 'solar@huawei.com',
      contactPhone: '+86 755 28780808'
    },
    {
      name: 'Enphase Energy',
      logoUrl: 'https://enphase.com/sites/default/files/2021-05/enphase-logo.png',
      website: 'https://enphase.com',
      country: 'USA',
      description: 'Leading provider of microinverter technology for the solar industry',
      contactEmail: 'info@enphase.com',
      contactPhone: '+1 877 797 4743'
    },
    
    // Battery Storage Manufacturers
    {
      name: 'Tesla Energy',
      logoUrl: 'https://www.tesla.com/sites/default/files/images/tesla-logo.png',
      website: 'https://www.tesla.com/energy',
      country: 'USA',
      description: 'Producer of advanced battery energy storage systems',
      contactEmail: 'energysales@tesla.com',
      contactPhone: '+1 888 765 2489'
    },
    {
      name: 'LG Energy Solution',
      logoUrl: 'https://www.lgessbattery.com/common/images/pc/logo.png',
      website: 'https://www.lgessbattery.com',
      country: 'South Korea',
      description: 'Leading manufacturer of lithium-ion batteries for energy storage systems',
      contactEmail: 'essinfo@lgensol.com',
      contactPhone: '+82 2 3773 1114'
    },
    {
      name: 'BYD Company',
      logoUrl: 'https://www.byd.com/content/dam/byd-site/en/brand/logo/BYD_logo.png',
      website: 'https://www.byd.com',
      country: 'China',
      description: 'Manufacturer of rechargeable batteries and battery storage solutions',
      contactEmail: 'info@byd.com',
      contactPhone: '+86 755 8988 8888'
    },
    {
      name: 'Sonnen',
      logoUrl: 'https://sonnengroup.com/wp-content/uploads/2021/01/sonnen-group-logo.png',
      website: 'https://sonnen.de',
      country: 'Germany',
      description: 'Pioneer in intelligent energy storage for homes and small businesses',
      contactEmail: 'info@sonnen.de',
      contactPhone: '+49 8304 92933 400'
    },
    {
      name: 'Pylontech',
      logoUrl: 'https://en.pylontech.com.cn/wp-content/themes/pylon-theme/assets/img/logo.png',
      website: 'https://en.pylontech.com.cn',
      country: 'China',
      description: 'Specializes in the production of lithium-ion batteries for residential and commercial ESS',
      contactEmail: 'info@pylontech.com.cn',
      contactPhone: '+86 21 5169 7236'
    },
    
    // EV Charger Manufacturers
    {
      name: 'ABB',
      logoUrl: 'https://new.abb.com/common/images/v3/common/abb-logo.png',
      website: 'https://new.abb.com/ev-charging',
      country: 'Switzerland',
      description: 'Leading provider of electric vehicle charging infrastructure',
      contactEmail: 'info@abb.com',
      contactPhone: '+41 43 317 71 11'
    },
    {
      name: 'ChargePoint',
      logoUrl: 'https://chargepoint.hs.llnwd.net/v1/chargepoint/images/cp-logo.svg',
      website: 'https://www.chargepoint.com',
      country: 'USA',
      description: 'Operates the largest network of electric vehicle charging stations',
      contactEmail: 'info@chargepoint.com',
      contactPhone: '+1 866 480 2936'
    },
    {
      name: 'Wallbox',
      logoUrl: 'https://wallbox.com/wp-content/themes/wallbox-2020/images/wallbox-logo.svg',
      website: 'https://wallbox.com',
      country: 'Spain',
      description: 'Provider of smart charging solutions for electric vehicles',
      contactEmail: 'support@wallbox.com',
      contactPhone: '+34 93 116 00 30'
    },
    {
      name: 'EVBox',
      logoUrl: 'https://evbox.com/img/evbox-logo.svg',
      website: 'https://evbox.com',
      country: 'Netherlands',
      description: 'Manufacturer of scalable EV charging solutions',
      contactEmail: 'info@evbox.com',
      contactPhone: '+31 88 7500 300'
    },
    {
      name: 'Schneider Electric',
      logoUrl: 'https://www.se.com/ww/resources/images/logo-header-se-white.svg',
      website: 'https://www.se.com',
      country: 'France',
      description: 'Global specialist in energy management and automation',
      contactEmail: 'support@schneider-electric.com',
      contactPhone: '+33 1 41 29 70 00'
    },
    
    // Smart Meter Manufacturers
    {
      name: 'Landis+Gyr',
      logoUrl: 'https://www.landisgyr.com/webfoo/wp-content/themes/landisgyr-newhome/assets/img/logo.svg',
      website: 'https://www.landisgyr.com',
      country: 'Switzerland',
      description: 'Global leader in smart metering and energy management solutions',
      contactEmail: 'info@landisgyr.com',
      contactPhone: '+41 41 935 6000'
    },
    {
      name: 'Itron',
      logoUrl: 'https://itron.com/-/media/feature/navigation/logo/itron-header-logo.svg',
      website: 'https://www.itron.com',
      country: 'USA',
      description: 'Provider of smart meters, data collection and utility software systems',
      contactEmail: 'info@itron.com',
      contactPhone: '+1 866 374 8766'
    },
    {
      name: 'Siemens',
      logoUrl: 'https://assets.new.siemens.com/siemens/assets/api/uuid:6db318e1-e0b8-461d-97e8-278ddd220ce9/siemens-logo-default-open-graph.png',
      website: 'https://new.siemens.com/global/en/products/energy/energy-automation-and-smart-grid/smart-metering.html',
      country: 'Germany',
      description: 'Provider of smart metering solutions and energy management systems',
      contactEmail: 'support@siemens.com',
      contactPhone: '+49 89 636 33443'
    },
    {
      name: 'Sensus',
      logoUrl: 'https://sensus.com/wp-content/themes/sensus2018/assets/images/logo.svg',
      website: 'https://sensus.com',
      country: 'USA',
      description: 'Provider of advanced metering technologies and smart grid systems',
      contactEmail: 'info@sensus.com',
      contactPhone: '+1 919 845 4000'
    },
    {
      name: 'Elster Group',
      logoUrl: 'https://www.elster-instromet.com/en/elster-logo.jpg',
      website: 'https://www.elster-instromet.com',
      country: 'Germany',
      description: 'Manufacturer of gas, electricity, and water meters and related communications systems',
      contactEmail: 'info@elster.com',
      contactPhone: '+49 6134 605 0'
    },
    
    // Heat Pump Manufacturers
    {
      name: 'Daikin',
      logoUrl: 'https://www.daikin.com/themes/daikin/images/common/logo.svg',
      website: 'https://www.daikin.com',
      country: 'Japan',
      description: 'Leading air conditioning and heat pump manufacturer',
      contactEmail: 'info@daikin.com',
      contactPhone: '+81 6 6374 9304'
    },
    {
      name: 'Mitsubishi Electric',
      logoUrl: 'https://www.mitsubishielectric.com/assets/images/common/logo-01.png',
      website: 'https://www.mitsubishielectric.com',
      country: 'Japan',
      description: 'Global manufacturer of heat pumps and HVAC systems',
      contactEmail: 'info@mitsubishielectric.com',
      contactPhone: '+81 3 3218 2111'
    },
    {
      name: 'Viessmann',
      logoUrl: 'https://www.viessmann.de/content/dam/vi-brands/DE/logos/Brands/Viessmann/viessmann-logo-positive.svg',
      website: 'https://www.viessmann.com',
      country: 'Germany',
      description: 'Manufacturer of heating, industrial, and refrigeration systems',
      contactEmail: 'info@viessmann.com',
      contactPhone: '+49 6452 70 0'
    },
    {
      name: 'Vaillant',
      logoUrl: 'https://www.vaillant.de/content/dam/vaillant/logos/vaillant-logo.png',
      website: 'https://www.vaillant.com',
      country: 'Germany',
      description: 'Leading European manufacturer of heating and ventilation systems',
      contactEmail: 'info@vaillant.de',
      contactPhone: '+49 2191 18 0'
    },
    {
      name: 'Nibe',
      logoUrl: 'https://www.nibe.eu/assets/images/nibe-logo.svg',
      website: 'https://www.nibe.eu',
      country: 'Sweden',
      description: 'Leading manufacturer of heat pumps in the Nordic countries',
      contactEmail: 'info@nibe.se',
      contactPhone: '+46 433 27 3000'
    },
    
    // Gateway/IoT Device Manufacturers
    {
      name: 'Cisco Systems',
      logoUrl: 'https://www.cisco.com/c/en/us/index/logo-dark.svg',
      website: 'https://www.cisco.com',
      country: 'USA',
      description: 'Global leader in networking and IoT gateway solutions',
      contactEmail: 'support@cisco.com',
      contactPhone: '+1 800 553 6387'
    },
    {
      name: 'Phoenix Contact',
      logoUrl: 'https://www.phoenixcontact.com/assets/logo-e71d0b6c.svg',
      website: 'https://www.phoenixcontact.com',
      country: 'Germany',
      description: 'Manufacturer of industrial automation, interconnection, and interface solutions',
      contactEmail: 'info@phoenixcontact.com',
      contactPhone: '+49 5235 3 12000'
    },
    {
      name: 'Dell Technologies',
      logoUrl: 'https://www.delltechnologies.com/etc.clientlibs/settings/wcm/designs/dtc-site/clientlibs/resources/images/dtc-logo.svg',
      website: 'https://www.delltechnologies.com',
      country: 'USA',
      description: 'Provider of edge computing solutions and IoT gateways',
      contactEmail: 'support@dell.com',
      contactPhone: '+1 800 624 9897'
    },
    {
      name: 'HMS Networks',
      logoUrl: 'https://www.hms-networks.com/images/librariesprovider7/default-album/hms-logo.svg',
      website: 'https://www.hms-networks.com',
      country: 'Sweden',
      description: 'Global leader in industrial communication and IIoT',
      contactEmail: 'info@hms.se',
      contactPhone: '+46 35 17 2900'
    },
    {
      name: 'Advantech',
      logoUrl: 'https://www.advantech.com/assets/ckeditor/images/logo.png',
      website: 'https://www.advantech.com',
      country: 'Taiwan',
      description: 'Provider of IoT hardware, software, and cloud solutions',
      contactEmail: 'support@advantech.com',
      contactPhone: '+886 2 2792 7818'
    }
  ];
  
  const insertedManufacturers = [];
  const updatedManufacturers = [];
  
  // Filter out manufacturers that already exist
  const newManufacturers = manufacturers.filter(m => !existingManufacturerNames.has(m.name));
  const manufacturersToUpdate = manufacturers.filter(m => existingManufacturerNames.has(m.name));
  
  console.log(`Inserting ${newManufacturers.length} new manufacturers and updating ${manufacturersToUpdate.length} existing ones`);
  
  // Insert new manufacturers
  if (newManufacturers.length > 0) {
    const inserted = await db.insert(deviceManufacturers).values(newManufacturers).returning();
    insertedManufacturers.push(...inserted);
  }
  
  // Update existing manufacturers
  for (const manufacturer of manufacturersToUpdate) {
    const existingManufacturer = existingManufacturers.find(m => m.name === manufacturer.name);
    
    if (existingManufacturer) {
      const [updated] = await db
        .update(deviceManufacturers)
        .set({
          ...manufacturer,
          updatedAt: new Date()
        })
        .where(sql`${deviceManufacturers.id} = ${existingManufacturer.id}`)
        .returning();
      
      updatedManufacturers.push(updated);
    }
  }
  
  console.log(`Inserted ${insertedManufacturers.length} new manufacturers, updated ${updatedManufacturers.length} existing ones`);
  
  // Return all manufacturers (both inserted and updated)
  return [...insertedManufacturers, ...updatedManufacturers];
}

/**
 * Seed device catalog with real device data
 * 
 * @param {Array} manufacturers - Previously inserted manufacturers
 */
async function seedDeviceCatalog(manufacturers) {
  console.log('Seeding device catalog...');
  
  // Find manufacturer IDs by name for easy reference
  const manufacturerMap = new Map();
  for (const manufacturer of manufacturers) {
    manufacturerMap.set(manufacturer.name, manufacturer.id);
  }
  
  // First, get existing device catalog entries to avoid duplication
  const existingDevices = await db.select().from(deviceCatalog);
  const existingModelNumbers = new Set(existingDevices.map(d => d.modelNumber));
  
  console.log(`Found ${existingDevices.length} existing device models in the database`);
  
  // Define device catalog entries
  const devices = [
    // SMA Solar Technology Products (Solar Inverters)
    {
      manufacturerId: manufacturerMap.get('SMA Solar Technology'),
      name: 'Sunny Boy 3.0',
      modelNumber: 'SB3.0-1AV-41',
      type: 'inverter', // Changed from 'solar_inverter' to match enum
      releaseYear: 2022,
      imageUrl: 'https://files.sma.de/downloads/SB30-50-1AV-41_front_W400px.png',
      capacity: 3.0,
      maxPower: 3000,
      efficiency: 97.0,
      dimensions: '435 x 470 x 176 mm',
      weight: 16,
      shortDescription: 'Residential string inverter with SMA Smart Connected service',
      fullDescription: 'The Sunny Boy 3.0 is ideal for homes with small PV systems. It is highly flexible with a range of module configurations. Integrated SMA Smart Connected service ensures lowest operating costs.',
      features: ['Integrated WLAN', 'SMA Smart Connected', 'Shade management with OptiTrac Global Peak', 'Secure Power Supply function'],
      supportedProtocols: ['Modbus RTU', 'Modbus TCP', 'SunSpec', 'Ethernet', 'Speedwire'],
      warranty: '5 years standard, extendable to 10/15/20 years',
      price: 1299.99,
      currency: 'EUR',
    },
    {
      manufacturerId: manufacturerMap.get('SMA Solar Technology'),
      name: 'Sunny Tripower 10.0',
      modelNumber: 'STP10.0-3AV-40',
      type: 'inverter', // Changed from 'solar_inverter' to match enum
      releaseYear: 2023,
      imageUrl: 'https://files.sma.de/downloads/STP3-10-3AV-40_front_W400px.png',
      capacity: 10.0,
      maxPower: 10000,
      efficiency: 98.1,
      dimensions: '460 x 497 x 176 mm',
      weight: 20.5,
      shortDescription: 'Three-phase inverter for commercial and residential systems',
      fullDescription: 'The Sunny Tripower 10.0 is a three-phase inverter that ensures highest yields and reduces operating costs in commercial systems. It combines flexibility in system design with reliability and performance.',
      features: ['Integrated WLAN and Ethernet', 'SMA Smart Connected', '3 independent MPP trackers', 'Shade management with OptiTrac Global Peak'],
      supportedProtocols: ['Modbus RTU', 'Modbus TCP', 'SunSpec', 'Ethernet', 'Speedwire', 'Webconnect'],
      warranty: '5 years standard, extendable to 10/15/20 years',
      price: 2599.99,
      currency: 'EUR',
    },
    
    // Tesla Energy Products (Battery Storage)
    {
      manufacturerId: manufacturerMap.get('Tesla Energy'),
      name: 'Powerwall 2',
      modelNumber: 'PW2',
      type: 'battery_storage', // Changed from 'battery' to match enum
      releaseYear: 2023,
      imageUrl: 'https://www.tesla.com/sites/default/files/powerwall/PW2_Standalone_Foreground.png',
      capacity: 13.5,
      maxPower: 5000,
      efficiency: 92.5,
      dimensions: '1150 x 755 x 155 mm',
      weight: 114,
      shortDescription: 'Rechargeable home battery system',
      fullDescription: 'The Tesla Powerwall 2 is a rechargeable lithium-ion battery with liquid thermal control. It stores electricity for solar self-consumption, time of use load shifting, and backup power.',
      features: ['Time-Based Control', 'Backup functionality', 'Storm Watch', 'Energy Monitoring'],
      supportedProtocols: ['Modbus TCP', 'CAN Bus', 'Ethernet', 'Wi-Fi'],
      warranty: '10 years',
      price: 8500,
      currency: 'USD',
    },
    {
      manufacturerId: manufacturerMap.get('Tesla Energy'),
      name: 'Powerwall+',
      modelNumber: 'PWP',
      type: 'battery_storage', // Changed from 'battery' to match enum
      releaseYear: 2023,
      imageUrl: 'https://www.tesla.com/sites/default/files/powerwall/PW2_Inverter_Foreground.png',
      capacity: 13.5,
      maxPower: 7600,
      efficiency: 93.0,
      dimensions: '1150 x 755 x 155 mm',
      weight: 125,
      shortDescription: 'Integrated solar inverter and Powerwall battery',
      fullDescription: 'The Tesla Powerwall+ integrates a solar inverter with the battery, simplifying installation and maximizing performance. It provides backup power during outages, even enabling whole-home backup when multiple units are installed.',
      features: ['Integrated solar inverter up to 7.6kW', 'Backup functionality', 'Time-Based Control', 'Energy Monitoring'],
      supportedProtocols: ['Modbus TCP', 'CAN Bus', 'Ethernet', 'Wi-Fi'],
      warranty: '10 years',
      price: 12000,
      currency: 'USD',
    },
    
    // ABB Products (EV Chargers)
    {
      manufacturerId: manufacturerMap.get('ABB'),
      name: 'Terra AC Wallbox',
      modelNumber: 'W22-T-R-0',
      type: 'ev_charger',
      releaseYear: 2023,
      imageUrl: 'https://new.abb.com/products/images/560/560-Terra-AC-W22-T.jpg',
      capacity: 22,
      maxPower: 22000,
      efficiency: 97.0,
      dimensions: '320 x 195 x 110 mm',
      weight: 7,
      shortDescription: 'Connected home EV charging station',
      fullDescription: 'The Terra AC Wallbox is a connected charger designed for homes and businesses. It offers smart functionality through the ABB Terra app, supporting charging sessions up to 22 kW.',
      features: ['Adjustable charging power', 'RFID authentication', 'Load management', 'Over-the-air updates'],
      supportedProtocols: ['OCPP 1.6J', 'MQTT', 'Ethernet', 'Wi-Fi', 'Bluetooth'],
      warranty: '2 years',
      price: 899,
      currency: 'EUR',
    },
    {
      manufacturerId: manufacturerMap.get('ABB'),
      name: 'Terra DC Wallbox',
      modelNumber: 'T24-G-R-0',
      type: 'ev_charger',
      releaseYear: 2023,
      imageUrl: 'https://new.abb.com/products/images/560/560-Terra-DC-T24-T.jpg',
      capacity: 24,
      maxPower: 24000,
      efficiency: 94.0,
      dimensions: '770 x 584 x 294 mm',
      weight: 70,
      shortDescription: 'Fast DC charging solution',
      fullDescription: 'The Terra DC Wallbox is a compact 24 kW DC fast charging solution for businesses, retail and commercial parking venues. It supports CCS and CHAdeMO standards, enabling fast charging for all EV models.',
      features: ['DC fast charging', 'Dual connector option (CCS & CHAdeMO)', 'RFID authentication', 'Load management'],
      supportedProtocols: ['OCPP 1.6J', 'MQTT', 'Ethernet', 'Wi-Fi', '4G'],
      warranty: '2 years',
      price: 10999,
      currency: 'EUR',
    },
    
    // Landis+Gyr Products (Smart Meters)
    {
      manufacturerId: manufacturerMap.get('Landis+Gyr'),
      name: 'E360',
      modelNumber: 'E360-D2C5',
      type: 'smart_meter',
      releaseYear: 2023,
      imageUrl: 'https://www.landisgyr.com/webfoo/wp-content/uploads/2019/06/LG_E360_MID_angle-1-1-1.png',
      capacity: null,
      maxPower: 100,
      efficiency: 99.8,
      dimensions: '216 x 131 x 80 mm',
      weight: 0.9,
      shortDescription: 'Advanced residential electricity meter',
      fullDescription: 'The Landis+Gyr E360 is an advanced residential smart meter with multi-energy capabilities. It enables remote reading, supports time-of-use tariffs, and allows for load management with direct consumer engagement.',
      features: ['Advanced metering', 'Remote disconnect/reconnect', 'Multi-utility support', 'Time-of-use billing'],
      supportedProtocols: ['DLMS/COSEM', 'Modbus', 'Wireless M-Bus', 'G3-PLC', 'Cellular'],
      warranty: '5 years',
      price: 199,
      currency: 'EUR',
    },
    {
      manufacturerId: manufacturerMap.get('Landis+Gyr'),
      name: 'E660',
      modelNumber: 'E660-D405',
      type: 'smart_meter',
      releaseYear: 2022,
      imageUrl: 'https://www.landisgyr.com/webfoo/wp-content/uploads/2019/06/LG_E660_closed_angle-1.png',
      capacity: null,
      maxPower: 400,
      efficiency: 99.9,
      dimensions: '329 x 178 x 115 mm',
      weight: 2.4,
      shortDescription: 'Advanced commercial and industrial meter',
      fullDescription: 'The Landis+Gyr E660 is designed for commercial and industrial applications with advanced power quality monitoring. It delivers accurate readings for billing and operational purposes with integrated communication options.',
      features: ['Advanced power quality monitoring', 'Load profile recording', 'Event logging', 'Multi-energy support'],
      supportedProtocols: ['DLMS/COSEM', 'Modbus RTU/TCP', 'IEC 61850', 'Ethernet', 'Cellular'],
      warranty: '5 years',
      price: 599,
      currency: 'EUR',
    },
    
    // Daikin Products (Heat Pumps)
    {
      manufacturerId: manufacturerMap.get('Daikin'),
      name: 'Altherma 3',
      modelNumber: 'EPGA-DV',
      type: 'heat_pump',
      releaseYear: 2023,
      imageUrl: 'https://www.daikin.eu/content/dam/DENV/product%20images/Altherma%203%20H%20HT/outdoor%20unit/EPRA-D/EPRA14DV3-004-Right-Front-View-Explosion-1.png',
      capacity: 16,
      maxPower: 5200,
      efficiency: null,
      dimensions: '1440 x 1160 x 380 mm',
      weight: 143,
      shortDescription: 'High-performance air-to-water heat pump',
      fullDescription: 'The Daikin Altherma 3 is an air-to-water heat pump that delivers heating, cooling, and hot water for homes. With its high energy efficiency, it reduces energy bills and carbon emissions while providing year-round comfort.',
      features: ['Space heating & cooling', 'Domestic hot water', 'Smart Grid Ready', 'Weather-dependent operation'],
      supportedProtocols: ['Modbus RTU', 'BACnet', 'LonWorks', 'KNX', 'WLAN'],
      warranty: '5 years',
      price: 7299,
      currency: 'EUR',
    },
    {
      manufacturerId: manufacturerMap.get('Daikin'),
      name: 'Altherma 3 GEO',
      modelNumber: 'EGSAH-D',
      type: 'heat_pump',
      releaseYear: 2023,
      imageUrl: 'https://www.daikin.eu/content/dam/DENV/product%20images/Altherma%203%20GEO/EGSAH-D%20indoor%20unit/EGSAH10DA9W-001-Right-View.png',
      capacity: 10,
      maxPower: 2900,
      efficiency: null,
      dimensions: '1891 x 597 x 666 mm',
      weight: 222,
      shortDescription: 'Ground source heat pump',
      fullDescription: 'The Daikin Altherma 3 GEO is a ground source heat pump that extracts energy from the ground to provide heating, cooling, and domestic hot water. It offers excellent efficiency even in the coldest climates.',
      features: ['Ground source heat extraction', 'Space heating & cooling', 'Domestic hot water', 'Bivalent system option'],
      supportedProtocols: ['Modbus RTU', 'BACnet', 'LonWorks', 'KNX', 'WLAN'],
      warranty: '5 years',
      price: 11999,
      currency: 'EUR',
    },
    
    // Cisco Systems Products (Gateways)
    {
      manufacturerId: manufacturerMap.get('Cisco Systems'),
      name: 'IR1101',
      modelNumber: 'IR1101-K9',
      type: 'energy_gateway', // Changed from 'gateway' to match enum
      releaseYear: 2023,
      imageUrl: 'https://www.cisco.com/c/en/us/products/routers/1101-industrial-integrated-services-router/index/_jcr_content/Grid/category_atl_9d27/layout-category-atl/anchor_info_d18b/image.img.jpg/1588789863750.jpg',
      capacity: null,
      maxPower: 25,
      efficiency: null,
      dimensions: '48 x 135 x 115 mm',
      weight: 0.75,
      shortDescription: 'Industrial IoT Gateway Router',
      fullDescription: 'The Cisco IR1101 is a modular, industrial, integrated services router that provides secure connectivity for critical infrastructure in harsh environments. It is designed for the Internet of Things (IoT) and supports multiple network protocols.',
      features: ['Modular design', 'Dual WAN connectivity', 'Industrial certifications', 'Advanced security'],
      supportedProtocols: ['Ethernet', 'Serial', '4G LTE', 'Wi-Fi', 'BLE', 'Zigbee', 'LoRaWAN'],
      warranty: '5 years',
      price: 1995,
      currency: 'USD',
    },
    {
      manufacturerId: manufacturerMap.get('Cisco Systems'),
      name: 'IC3000',
      modelNumber: 'IC3000-2C2D-K9',
      type: 'energy_gateway', // Changed from 'gateway' to match enum
      releaseYear: 2022,
      imageUrl: 'https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-micro-switches/catalyst-micro-switches-datasheet/_jcr_content/Grid/subcategory_atl/layout-subcategory-atl/anchor_info/image.img.jpg/1588790522559.jpg',
      capacity: null,
      maxPower: 40,
      efficiency: null,
      dimensions: '95 x 120 x 120 mm',
      weight: 1.0,
      shortDescription: 'Industrial compute gateway',
      fullDescription: 'The Cisco IC3000 Industrial Compute Gateway brings edge computing capabilities to industrial IoT environments. It runs containerized applications at the network edge to enable real-time data processing and analytics.',
      features: ['Edge computing', 'Docker container support', 'Ruggedized design', 'Application hosting'],
      supportedProtocols: ['Ethernet', 'Serial', 'CAN bus', 'Modbus', 'MQTT', 'OPC UA'],
      warranty: '5 years',
      price: 2395,
      currency: 'USD',
    }
  ];
  
  const insertedDevices = [];
  const updatedDevices = [];
  
  // Filter out devices that already exist
  const newDevices = devices.filter(d => !existingModelNumbers.has(d.modelNumber));
  const devicesToUpdate = devices.filter(d => existingModelNumbers.has(d.modelNumber));
  
  console.log(`Inserting ${newDevices.length} new devices and updating ${devicesToUpdate.length} existing ones`);
  
  // Insert new devices
  if (newDevices.length > 0) {
    const inserted = await db.insert(deviceCatalog).values(newDevices).returning();
    insertedDevices.push(...inserted);
  }
  
  // Update existing devices
  for (const device of devicesToUpdate) {
    const existingDevice = existingDevices.find(d => d.modelNumber === device.modelNumber);
    
    if (existingDevice) {
      const [updated] = await db
        .update(deviceCatalog)
        .set({
          ...device,
          updatedAt: new Date()
        })
        .where(sql`${deviceCatalog.id} = ${existingDevice.id}`)
        .returning();
      
      updatedDevices.push(updated);
    }
  }
  
  console.log(`Inserted ${insertedDevices.length} new devices, updated ${updatedDevices.length} existing ones`);
  
  // Return all devices (both inserted and updated)
  return [...insertedDevices, ...updatedDevices];
}

/**
 * Seed technical specifications for devices
 * 
 * @param {Array} deviceCatalogData - Previously inserted device catalog entries
 */
async function seedTechnicalSpecs(deviceCatalogData) {
  console.log('Seeding technical specifications...');
  
  // Map device IDs by model number for easy reference
  const deviceMap = new Map();
  for (const device of deviceCatalogData) {
    deviceMap.set(device.modelNumber, device.id);
  }
  
  // Get existing technical specs to avoid duplication
  const existingTechSpecs = await db.select().from(deviceTechnicalSpecs);
  
  // Create a set of device IDs that already have tech specs
  const existingTechSpecsDeviceIds = new Set(existingTechSpecs.map(t => t.deviceCatalogId));
  
  console.log(`Found ${existingTechSpecs.length} existing technical specifications in the database`);
  
  // Define technical specifications
  const techSpecs = [
    // Solar Inverter Technical Specs
    {
      deviceCatalogId: deviceMap.get('SB3.0-1AV-41'), // Sunny Boy 3.0
      // General specifications
      errorMargin: 0.5,
      selfConsumption: 5.0,
      temperatureRange: '-25°C to 60°C',
      ipRating: 'IP65',
      
      // Inverter specific
      mpptEfficiency: 99.5,
      euroEfficiency: 97.0,
      standbyConsumption: 3.5,
      
      // Additional specs
      additionalSpecs: {
        inputVoltageRange: '110V - 500V',
        maxInputCurrent: '12A',
        numberOfMPPTrackers: 1,
        maxStringsPerMPPTracker: 2,
        harmonicDistortion: '<3%',
        operatingAltitude: '0-2000m',
        coolingMethod: 'Convection',
        noiseLevel: '<25 dB(A)',
        nighttimePowerConsumption: '<0.5W',
        transformerless: true,
        displayType: 'LED status indicators'
      },
      
      // Certifications
      certifications: [
        'IEC 62109-1/-2',
        'VDE-AR-N 4105',
        'EN 50549-1',
        'UL 1741',
        'IEEE 1547'
      ],
      complianceStandards: [
        'G83/G98',
        'AS4777',
        'CEI 0-21',
        'RD 1699',
        'NEN-EN50549'
      ]
    },
    {
      deviceCatalogId: deviceMap.get('STP10.0-3AV-40'), // Sunny Tripower 10.0
      // General specifications
      errorMargin: 0.45,
      selfConsumption: 7.5,
      temperatureRange: '-25°C to 60°C',
      ipRating: 'IP65',
      
      // Inverter specific
      mpptEfficiency: 99.8,
      euroEfficiency: 98.1,
      standbyConsumption: 5.0,
      
      // Additional specs
      additionalSpecs: {
        inputVoltageRange: '140V - 800V',
        maxInputCurrent: '16A per MPPT',
        numberOfMPPTrackers: 3,
        maxStringsPerMPPTracker: 1,
        harmonicDistortion: '<1.5%',
        operatingAltitude: '0-3000m',
        coolingMethod: 'OptiCool',
        noiseLevel: '<30 dB(A)',
        nighttimePowerConsumption: '<1W',
        transformerless: true,
        displayType: 'LED status indicators'
      },
      
      // Certifications
      certifications: [
        'IEC 62109-1/-2',
        'VDE-AR-N 4105',
        'EN 50549-1',
        'UL 1741',
        'IEEE 1547'
      ],
      complianceStandards: [
        'G83/G98',
        'AS4777',
        'CEI 0-21',
        'RD 1699',
        'NEN-EN50549'
      ]
    },
    
    // Battery Storage Technical Specs
    {
      deviceCatalogId: deviceMap.get('PW2'), // Powerwall 2
      // General specifications
      errorMargin: 1.0,
      selfConsumption: 7.0,
      temperatureRange: '-20°C to 50°C',
      ipRating: 'IP67',
      
      // Battery specific
      depthOfDischargeMax: 100.0,
      cycleLifeAt80Percent: 3500,
      roundTripEfficiency: 92.5,
      selfDischargeRate: 0.33,
      
      // Additional specs
      additionalSpecs: {
        batteryChemistry: 'Lithium-ion NMC',
        voltageRange: '350-450V DC',
        operatingVoltage: '380V DC nominal',
        peakPower: '7kW',
        continuousPower: '5kW',
        stackable: 'Up to 10 units',
        operatingAltitude: '0-3000m',
        coolingMethod: 'Liquid thermal management',
        communicationInterface: 'Ethernet, Wi-Fi',
        onboardInverter: false,
        responseTime: '<100ms',
        installationLocation: 'Indoor/Outdoor',
        monitoringSystem: 'Tesla app'
      },
      
      // Certifications
      certifications: [
        'UL 1642',
        'UL 1741',
        'UL 1973',
        'IEC 62109-1/2',
        'UN 38.3'
      ],
      complianceStandards: [
        'IEEE 1547',
        'FCC Part 15 Class B',
        'AS4777',
        'CE',
        'TÜV'
      ]
    },
    {
      deviceCatalogId: deviceMap.get('PWP'), // Powerwall+
      // General specifications
      errorMargin: 0.9,
      selfConsumption: 9.0,
      temperatureRange: '-20°C to 50°C',
      ipRating: 'IP67',
      
      // Battery specific
      depthOfDischargeMax: 100.0,
      cycleLifeAt80Percent: 3500,
      roundTripEfficiency: 93.0,
      selfDischargeRate: 0.3,
      
      // Inverter specific
      mpptEfficiency: 99.0,
      euroEfficiency: 96.5,
      standbyConsumption: 5.5,
      
      // Additional specs
      additionalSpecs: {
        batteryChemistry: 'Lithium-ion NMC',
        voltageRange: '350-450V DC',
        operatingVoltage: '380V DC nominal',
        peakPower: '9.6kW',
        continuousPower: '7.6kW',
        stackable: 'Up to 10 units',
        solarInputs: '4 strings',
        backupCapability: 'Partial or whole home',
        operatingAltitude: '0-3000m',
        coolingMethod: 'Liquid thermal management',
        communicationInterface: 'Ethernet, Wi-Fi',
        onboardInverter: true,
        responseTime: '<100ms',
        installationLocation: 'Indoor/Outdoor',
        monitoringSystem: 'Tesla app'
      },
      
      // Certifications
      certifications: [
        'UL 1642',
        'UL 1741',
        'UL 1973',
        'IEC 62109-1/2',
        'UN 38.3'
      ],
      complianceStandards: [
        'IEEE 1547',
        'FCC Part 15 Class B',
        'AS4777',
        'CE',
        'TÜV'
      ]
    },
    
    // EV Charger Technical Specs
    {
      deviceCatalogId: deviceMap.get('W22-T-R-0'), // Terra AC Wallbox
      // General specifications
      errorMargin: 0.5,
      selfConsumption: 4.0,
      temperatureRange: '-25°C to 50°C',
      ipRating: 'IP54',
      
      // EV Charger specific
      standbyPower: 3.5,
      chargingEfficiency: 97.0,
      
      // Additional specs
      additionalSpecs: {
        inputVoltage: '3-phase, 400V AC',
        connectionType: 'Type 2 socket',
        cableLength: 'Optional 5m or 7m',
        maxChargingCurrent: '32A',
        operatingAltitude: '0-2000m',
        connectivityOptions: 'Ethernet, WiFi, 4G (optional)',
        authenticationMethods: 'RFID, App, Plug & Charge',
        loadBalancing: 'Dynamic load management support',
        gridIntegration: 'Smart Grid Ready',
        mountingOptions: 'Wall, pedestal',
        integratedMeter: 'MID-certified',
        enclosureMaterial: 'Polycarbonate, UV resistant',
        operatingHumidity: '5% to 95% non-condensing',
        displayType: 'LED status ring'
      },
      
      // Certifications
      certifications: [
        'IEC 61851-1',
        'IEC 61851-22',
        'IEC 62196',
        'CE'
      ],
      complianceStandards: [
        'EMC Class B',
        'IEC 61000-6-1/2/3/4',
        'OCPP 1.6J',
        'MID-certification'
      ]
    },
    {
      deviceCatalogId: deviceMap.get('T24-G-R-0'), // Terra DC Wallbox
      // General specifications
      errorMargin: 0.8,
      selfConsumption: 25.0,
      temperatureRange: '-35°C to 50°C',
      ipRating: 'IP54',
      
      // EV Charger specific
      standbyPower: 22.0,
      chargingEfficiency: 94.0,
      
      // Additional specs
      additionalSpecs: {
        inputVoltage: '3-phase, 400V AC',
        connectionType: 'CCS (Combo 2), CHAdeMO (optional)',
        outputVoltageRange: '150-500V DC',
        maxChargingCurrent: '60A DC',
        operatingAltitude: '0-2000m',
        connectivityOptions: 'Ethernet, WiFi, 4G, OCPP 1.6J',
        authenticationMethods: 'RFID, App, QR code',
        loadBalancing: 'Dynamic load management',
        gridIntegration: 'Smart Grid Ready',
        mountingOptions: 'Wall, pedestal',
        integratedMeter: 'DC meter',
        coolingSystem: 'Forced air cooling',
        enclosureMaterial: 'Stainless steel, aluminum',
        operatingHumidity: '5% to 95% non-condensing',
        displayType: '7-inch touchscreen'
      },
      
      // Certifications
      certifications: [
        'IEC 61851-1',
        'IEC 61851-23',
        'IEC 62196',
        'CE'
      ],
      complianceStandards: [
        'EMC Class B',
        'IEC 61000-6-1/2/3/4',
        'OCPP 1.6J',
        'ISO 15118'
      ]
    },
    
    // Smart Meter Technical Specs
    {
      deviceCatalogId: deviceMap.get('E360-D2C5'), // Landis+Gyr E360
      // General specifications
      errorMargin: 0.2,
      selfConsumption: 0.7,
      temperatureRange: '-40°C to 70°C',
      ipRating: 'IP54',
      
      // Smart Meter specific
      accuracyClass: 'Class 1 (active energy), Class 2 (reactive energy)',
      measurementPrecision: 0.1,
      
      // Additional specs
      additionalSpecs: {
        voltageRange: '120-277V AC',
        frequencyRange: '50/60Hz',
        currentRange: '5-100A',
        measurementParameters: 'Energy, voltage, current, power factor, frequency',
        dataStorage: '4MB non-volatile memory',
        dataInterval: 'Configurable 5, 15, 30, 60 minutes',
        communicationOptions: 'Cellular, RF mesh, PLC',
        tamperDetection: 'Magnetic, cover removal, reverse energy',
        loadControl: 'Up to 4 relays',
        displayType: 'Backlit LCD',
        eventLogging: 'Up to 1000 events',
        batteryBackup: 'Lithium, 15+ years life',
        demandMeasurement: 'Block and sliding window',
        powerQualityMonitoring: 'Basic',
        netMetering: 'Bidirectional measurement',
        timeKeeping: 'RTC with sync capability'
      },
      
      // Certifications
      certifications: [
        'MID',
        'IEC 62052-11',
        'IEC 62053-21/22/23',
        'ANSI C12.1/12.20'
      ],
      complianceStandards: [
        'DLMS/COSEM',
        'IEC 62056',
        'ANSI C12.18/C12.19',
        'G3-PLC',
        'WELMEC 7.2'
      ]
    },
    {
      deviceCatalogId: deviceMap.get('E660-D405'), // Landis+Gyr E660
      // General specifications
      errorMargin: 0.1,
      selfConsumption: 1.5,
      temperatureRange: '-40°C to 70°C',
      ipRating: 'IP54',
      
      // Smart Meter specific
      accuracyClass: 'Class 0.2S (active energy), Class 0.5S (reactive energy)',
      measurementPrecision: 0.05,
      
      // Additional specs
      additionalSpecs: {
        voltageRange: '57-277V AC phase-neutral, 100-480V AC phase-phase',
        frequencyRange: '50/60Hz',
        currentRange: '1-10A (transformer connected)',
        measurementParameters: 'Comprehensive power quality metrics',
        dataStorage: '16MB non-volatile memory',
        dataInterval: 'Configurable down to 1 minute',
        communicationOptions: 'Ethernet, Cellular, Serial, Optical',
        tamperDetection: 'Comprehensive with logging',
        powerQualityMonitoring: 'Advanced with waveform capture',
        displayType: 'Graphical LCD',
        eventLogging: 'Up to 10,000 events',
        batteryBackup: 'Lithium, 20+ years life',
        demandMeasurement: 'Multiple methods',
        harmonicAnalysis: 'Up to 50th harmonic',
        transformerCompensation: 'Line and transformer loss compensation',
        testOutputs: 'Optical and S0',
        phaseConfiguration: 'Multi-configuration (3P4W, 3P3W, etc.)'
      },
      
      // Certifications
      certifications: [
        'MID',
        'IEC 62052-11',
        'IEC 62053-22/23/24',
        'IEC 61000-4-30 Class A'
      ],
      complianceStandards: [
        'DLMS/COSEM',
        'IEC 62056',
        'IEC 61850',
        'Modbus',
        'DNP3'
      ]
    },
    
    // Heat Pump Technical Specs
    {
      deviceCatalogId: deviceMap.get('EPGA-DV'), // Daikin Altherma 3
      // General specifications
      errorMargin: 1.5,
      selfConsumption: 35.0,
      temperatureRange: '-28°C to 35°C',
      ipRating: 'IP66',
      
      // Heat Pump specific
      cop: 4.7,
      copAt7C: 4.85,
      copAtMinus7C: 3.5,
      refrigerantType: 'R-32',
      
      // Additional specs
      additionalSpecs: {
        heatingCapacity: '16kW at 7°C outdoor',
        coolingCapacity: '13.5kW at 35°C outdoor',
        soundPowerLevel: '54 dB(A)',
        soundPressureLevel: '43 dB(A) at 1m',
        defrostMethod: 'Advanced defrost logic',
        waterFlowRate: '25-60 l/min',
        maxWaterTemperature: '60°C',
        electricBackup: 'Optional 3/6/9 kW',
        compressorType: 'Hermetically sealed swing compressor',
        expansionValve: 'Electronic',
        refrigerantCharge: '3.25 kg',
        gwpRefrigerant: 675,
        waterPressureDrop: '25 kPa at nominal flow',
        pumpPower: '125W',
        waterConnectionSize: '1 1/4" male',
        antilegionellaMode: 'Yes, programmable',
        smartGridReady: true,
        weatherCompensation: 'Built-in'
      },
      
      // Certifications
      certifications: [
        'CE',
        'Eurovent',
        'EHPA',
        'MCS'
      ],
      complianceStandards: [
        'ErP',
        'EMC Directive 2014/30/EU',
        'Low Voltage Directive 2014/35/EU',
        'RoHS',
        'PED'
      ]
    },
    {
      deviceCatalogId: deviceMap.get('EGSAH-D'), // Daikin Altherma 3 GEO
      // General specifications
      errorMargin: 1.0,
      selfConsumption: 28.0,
      temperatureRange: '0°C to 35°C',
      ipRating: 'IP44',
      
      // Heat Pump specific
      cop: 5.1,
      copAt7C: null, // Not applicable for ground source
      copAtMinus7C: null, // Not applicable for ground source
      refrigerantType: 'R-32',
      
      // Additional specs
      additionalSpecs: {
        heatingCapacity: '10kW',
        coolingCapacity: '8kW passive cooling',
        soundPowerLevel: '39 dB(A)',
        soundPressureLevel: '27 dB(A) at 1m',
        brineFlowRate: '15-40 l/min',
        waterFlowRate: '15-40 l/min',
        maxWaterTemperature: '65°C',
        electricBackup: 'Integrated 9 kW, 3-stage',
        compressorType: 'Hermetically sealed scroll compressor',
        expansionValve: 'Electronic',
        refrigerantCharge: '1.8 kg',
        gwpRefrigerant: 675,
        brinePressureDrop: '23 kPa at nominal flow',
        waterPressureDrop: '23 kPa at nominal flow',
        brineConnectionSize: '1 1/4" female',
        waterConnectionSize: '1" female',
        integratedDomesticHotWaterTank: '180L',
        smartGridReady: true,
        weatherCompensation: 'Built-in',
        spaceSavingInstallation: 'All hydraulic components integrated'
      },
      
      // Certifications
      certifications: [
        'CE',
        'Eurovent',
        'EHPA',
        'MCS',
        'KIWA'
      ],
      complianceStandards: [
        'ErP A+++ (space heating)',
        'ErP A+ (hot water)',
        'EMC Directive 2014/30/EU',
        'Low Voltage Directive 2014/35/EU',
        'RoHS'
      ]
    },
    
    // Gateway Technical Specs
    {
      deviceCatalogId: deviceMap.get('IR1101-K9'), // Cisco IR1101
      // General specifications
      errorMargin: 0.1,
      selfConsumption: 25.0,
      temperatureRange: '-40°C to 75°C',
      ipRating: 'IP30',
      
      // Additional specs
      additionalSpecs: {
        processorType: 'Intel x86',
        cpuCores: 4,
        memory: '4GB DDR4',
        storage: '16GB eMMC, expandable via SD card',
        ethernetPorts: '4x GE RJ45',
        serialPorts: '1x RS232/RS485',
        usbPorts: '1x USB 3.0',
        wirelessOptions: 'LTE-Advanced, WiFi 6, BLE 5.1',
        powerInputOptions: '12-24V DC, PoE+',
        powerConsumption: '25W typical, 40W peak',
        redundantPower: 'Yes',
        dinRailMounting: 'Yes',
        dimensions: '48 x 135 x 115 mm',
        operatingHumidity: '5% to 95% non-condensing',
        mtbf: '300,000 hours',
        installationLocation: 'Indoor/Outdoor (with enclosure)',
        bootTime: '<60 seconds',
        secureBootCapability: 'Yes',
        hardwareSecurityModule: 'Yes',
        operatingSystem: 'Cisco IOS XE'
      },
      
      // Certifications
      certifications: [
        'IEC 60068-2',
        'UL 60950-1',
        'EN 55022/CISPR 22',
        'MIL-STD-810G',
        'NEMA TS-2'
      ],
      complianceStandards: [
        'IEC 61850-3',
        'IEEE 1613',
        'EN 50121',
        'FIPS 140-2',
        'ISA12.12.01 Class I, Div 2'
      ]
    },
    {
      deviceCatalogId: deviceMap.get('IC3000-2C2D-K9'), // Cisco IC3000
      // General specifications
      errorMargin: 0.1,
      selfConsumption: 40.0,
      temperatureRange: '-40°C to 70°C',
      ipRating: 'IP40',
      
      // Additional specs
      additionalSpecs: {
        processorType: 'Intel x86',
        cpuCores: 6,
        memory: '8GB DDR4',
        storage: '128GB SSD',
        ethernetPorts: '6x GE RJ45',
        serialPorts: '2x RS232/RS485',
        usbPorts: '2x USB 3.0',
        wirelessOptions: 'LTE-Advanced, WiFi 6, BLE 5.1, Zigbee',
        powerInputOptions: '12-48V DC, 100-240V AC',
        powerConsumption: '40W typical, 60W peak',
        redundantPower: 'Yes',
        dinRailMounting: 'Yes',
        rackMounting: 'Yes',
        dimensions: '95 x 120 x 120 mm',
        operatingHumidity: '5% to 95% non-condensing',
        mtbf: '350,000 hours',
        fanless: 'Yes',
        installationLocation: 'Indoor/Outdoor (with enclosure)',
        bootTime: '<45 seconds',
        secureBootCapability: 'Yes',
        hardwareSecurityModule: 'Yes, TPM 2.0',
        operatingSystem: 'Cisco IOx',
        dockerSupport: 'Yes, integrated Docker engine'
      },
      
      // Certifications
      certifications: [
        'IEC 60068-2',
        'UL 60950-1',
        'EN 55022/CISPR 22',
        'MIL-STD-810G',
        'NEMA TS-2'
      ],
      complianceStandards: [
        'IEC 61850-3',
        'IEEE 1613',
        'EN 50121',
        'FIPS 140-2',
        'ISA12.12.01 Class I, Div 2'
      ]
    }
  ];
  
  const insertedTechSpecs = [];
  const updatedTechSpecs = [];
  
  // Filter out specs for devices that already have tech specs
  const newTechSpecs = techSpecs.filter(s => !existingTechSpecsDeviceIds.has(s.deviceCatalogId));
  const techSpecsToUpdate = techSpecs.filter(s => existingTechSpecsDeviceIds.has(s.deviceCatalogId));
  
  console.log(`Inserting ${newTechSpecs.length} new tech specs and updating ${techSpecsToUpdate.length} existing ones`);
  
  // Insert new tech specs
  if (newTechSpecs.length > 0) {
    for (const techSpec of newTechSpecs) {
      try {
        const [insertedSpec] = await db.insert(deviceTechnicalSpecs).values(techSpec).returning();
        insertedTechSpecs.push(insertedSpec);
      } catch (error) {
        console.error(`Error inserting tech spec for device ID ${techSpec.deviceCatalogId}:`, error.message);
      }
    }
  }
  
  // Update existing tech specs
  for (const techSpec of techSpecsToUpdate) {
    const existingSpec = existingTechSpecs.find(s => s.deviceCatalogId === techSpec.deviceCatalogId);
    
    if (existingSpec) {
      try {
        const [updated] = await db
          .update(deviceTechnicalSpecs)
          .set({
            ...techSpec,
            updatedAt: new Date()
          })
          .where(sql`${deviceTechnicalSpecs.deviceCatalogId} = ${existingSpec.deviceCatalogId}`)
          .returning();
        
        updatedTechSpecs.push(updated);
      } catch (error) {
        console.error(`Error updating tech spec for device ID ${techSpec.deviceCatalogId}:`, error.message);
      }
    }
  }
  
  console.log(`Inserted ${insertedTechSpecs.length} new tech specs, updated ${updatedTechSpecs.length} existing ones`);
  
  // Return all tech specs (both inserted and updated)
  return [...insertedTechSpecs, ...updatedTechSpecs];
}

/**
 * Seed configuration presets for devices
 * 
 * @param {Array} deviceCatalogData - Previously inserted device catalog entries
 */
async function seedConfigurationPresets(deviceCatalogData) {
  console.log('Seeding configuration presets...');
  
  // Map device IDs by model number for easy reference
  const deviceMap = new Map();
  for (const device of deviceCatalogData) {
    deviceMap.set(device.modelNumber, device.id);
  }
  
  // First, get existing presets to avoid duplication
  const existingPresets = await db.select().from(deviceCatalogPresets);
  
  // Create a map of existing presets by device catalog id and name (which together should be unique)
  const existingPresetMap = new Map();
  for (const preset of existingPresets) {
    const key = `${preset.deviceCatalogId}-${preset.name}`;
    existingPresetMap.set(key, preset);
  }
  
  console.log(`Found ${existingPresets.length} existing configuration presets in the database`);
  
  // Define configuration presets
  const presets = [
    // Solar Inverter Presets
    {
      deviceCatalogId: deviceMap.get('SB3.0-1AV-41'), // Sunny Boy 3.0
      name: 'Residential Standard',
      description: 'Standard configuration for residential installations',
      configValues: {
        maxGridFeedIn: 100, // percentage of rated power
        powerLimitationEnabled: false,
        mpptMode: 'automatic',
        gridGuardCode: '12345',
        gridCodeSettings: {
          frequencyLimitsLow: [47.5, 'Hz', 3, 's'],
          frequencyLimitsHigh: [51.5, 'Hz', 0.1, 's'],
          voltageLimitsLow: [195, 'V', 1.5, 's'],
          voltageLimitsHigh: [253, 'V', 0.2, 's']
        },
        communicationSettings: {
          modbusEnabled: true,
          modbusAddress: 1,
          modbusPort: 502,
          sunSpecEnabled: true
        }
      },
      isDefault: true
    },
    {
      deviceCatalogId: deviceMap.get('SB3.0-1AV-41'), // Sunny Boy 3.0
      name: 'Feed-In Limit 70%',
      description: 'Configuration with 70% grid feed-in limitation',
      configValues: {
        maxGridFeedIn: 70, // percentage of rated power
        powerLimitationEnabled: true,
        mpptMode: 'automatic',
        gridGuardCode: '12345',
        gridCodeSettings: {
          frequencyLimitsLow: [47.5, 'Hz', 3, 's'],
          frequencyLimitsHigh: [51.5, 'Hz', 0.1, 's'],
          voltageLimitsLow: [195, 'V', 1.5, 's'],
          voltageLimitsHigh: [253, 'V', 0.2, 's']
        },
        communicationSettings: {
          modbusEnabled: true,
          modbusAddress: 1,
          modbusPort: 502,
          sunSpecEnabled: true
        }
      },
      isDefault: false
    },
    {
      deviceCatalogId: deviceMap.get('STP10.0-3AV-40'), // Sunny Tripower 10.0
      name: 'Commercial Standard',
      description: 'Standard configuration for commercial installations',
      configValues: {
        maxGridFeedIn: 100, // percentage of rated power
        powerLimitationEnabled: false,
        mpptMode: 'automatic',
        gridGuardCode: '12345',
        dynamicActivePowerControl: true,
        gridCodeSettings: {
          frequencyLimitsLow: [47.5, 'Hz', 3, 's'],
          frequencyLimitsHigh: [51.5, 'Hz', 0.1, 's'],
          voltageLimitsLow: [195, 'V', 1.5, 's'],
          voltageLimitsHigh: [253, 'V', 0.2, 's']
        },
        communicationSettings: {
          modbusEnabled: true,
          modbusAddress: 1,
          modbusPort: 502,
          sunSpecEnabled: true
        }
      },
      isDefault: true
    },
    
    // Battery Storage Presets
    {
      deviceCatalogId: deviceMap.get('PW2'), // Powerwall 2
      name: 'Self-Consumption',
      description: 'Optimized for maximizing self-consumption of solar energy',
      configValues: {
        operationMode: 'self_consumption',
        reservePercentage: 20, // backup reserve
        maxChargeRate: 100, // percentage of max power
        maxDischargeRate: 100, // percentage of max power
        timeOfUseSettings: {
          enabled: false
        },
        stormWatchEnabled: true,
        gridChargingEnabled: false,
        lowBatteryThreshold: 10
      },
      isDefault: true
    },
    {
      deviceCatalogId: deviceMap.get('PW2'), // Powerwall 2
      name: 'Backup Only',
      description: 'Configured as a backup power source only',
      configValues: {
        operationMode: 'backup_only',
        reservePercentage: 100, // backup reserve
        maxChargeRate: 100, // percentage of max power
        maxDischargeRate: 100, // percentage of max power
        timeOfUseSettings: {
          enabled: false
        },
        stormWatchEnabled: true,
        gridChargingEnabled: true,
        lowBatteryThreshold: 10
      },
      isDefault: false
    },
    {
      deviceCatalogId: deviceMap.get('PW2'), // Powerwall 2
      name: 'Time-Based Control',
      description: 'Optimized for charging during off-peak and discharging during peak hours',
      configValues: {
        operationMode: 'time_based',
        reservePercentage: 20, // backup reserve
        maxChargeRate: 100, // percentage of max power
        maxDischargeRate: 100, // percentage of max power
        timeOfUseSettings: {
          enabled: true,
          peakHours: [
            { start: '16:00', end: '20:00', days: [1, 2, 3, 4, 5] }, // weekdays 4-8pm
            { start: '17:00', end: '21:00', days: [0, 6] } // weekends 5-9pm
          ],
          offPeakHours: [
            { start: '00:00', end: '06:00', days: [0, 1, 2, 3, 4, 5, 6] } // every day midnight-6am
          ]
        },
        stormWatchEnabled: true,
        gridChargingEnabled: true,
        lowBatteryThreshold: 10
      },
      isDefault: false
    },
    {
      deviceCatalogId: deviceMap.get('PWP'), // Powerwall+
      name: 'Solar Self-Consumption',
      description: 'Optimized for maximizing self-consumption of solar energy with integrated inverter',
      configValues: {
        operationMode: 'self_consumption',
        reservePercentage: 20, // backup reserve
        maxChargeRate: 100, // percentage of max power
        maxDischargeRate: 100, // percentage of max power
        inverterSettings: {
          mpptMode: 'automatic',
          shadowOptimization: true
        },
        timeOfUseSettings: {
          enabled: false
        },
        stormWatchEnabled: true,
        gridChargingEnabled: false,
        lowBatteryThreshold: 10
      },
      isDefault: true
    },
    
    // EV Charger Presets
    {
      deviceCatalogId: deviceMap.get('W22-T-R-0'), // Terra AC Wallbox
      name: 'Standard Charging',
      description: 'Standard configuration for residential EV charging',
      configValues: {
        maxChargingCurrent: 32, // amperes
        loadBalancingEnabled: false,
        authenticationRequired: false,
        rfidEnabled: true,
        smartChargingEnabled: false,
        ledBrightness: 80, // percentage
        autoStartCharging: true,
        networkSettings: {
          dhcpEnabled: true,
          connectionType: 'wifi'
        },
        ocppSettings: {
          enabled: false
        }
      },
      isDefault: true
    },
    {
      deviceCatalogId: deviceMap.get('W22-T-R-0'), // Terra AC Wallbox
      name: 'Grid-Friendly',
      description: 'Configuration optimized for minimal grid impact',
      configValues: {
        maxChargingCurrent: 16, // amperes (limited)
        loadBalancingEnabled: true,
        authenticationRequired: true,
        rfidEnabled: true,
        smartChargingEnabled: true,
        solarMatchingEnabled: true,
        ledBrightness: 80, // percentage
        autoStartCharging: false,
        networkSettings: {
          dhcpEnabled: true,
          connectionType: 'wifi'
        },
        ocppSettings: {
          enabled: true,
          url: 'wss://ocpp.example.com/ws',
          basicAuthEnabled: true
        }
      },
      isDefault: false
    },
    {
      deviceCatalogId: deviceMap.get('T24-G-R-0'), // Terra DC Wallbox
      name: 'Commercial Fast Charging',
      description: 'Configuration for commercial DC fast charging',
      configValues: {
        maxChargingPower: 24, // kilowatts
        loadBalancingEnabled: true,
        authenticationRequired: true,
        rfidEnabled: true,
        paymentEnabled: true,
        displayBrightness: 90, // percentage
        autoStartCharging: false,
        connectorSelection: ['CCS', 'CHAdeMO'],
        sessionTimeout: 30, // minutes
        networkSettings: {
          dhcpEnabled: true,
          connectionType: 'ethernet',
          fallbackConnection: '4g'
        },
        ocppSettings: {
          enabled: true,
          url: 'wss://ocpp.example.com/ws',
          basicAuthEnabled: true,
          heartbeatInterval: 300 // seconds
        }
      },
      isDefault: true
    },
    
    // Smart Meter Presets
    {
      deviceCatalogId: deviceMap.get('E360-D2C5'), // Landis+Gyr E360
      name: 'Residential Default',
      description: 'Default configuration for residential metering',
      configValues: {
        dataLoggingInterval: 15, // minutes
        displayMode: 'cycling',
        displayItems: ['total_energy', 'current_power', 'voltage', 'date_time'],
        communicationSettings: {
          protocol: 'DLMS/COSEM',
          encryptionEnabled: true,
          authenticationEnabled: true
        },
        alarmSettings: {
          powerOutageEnabled: true,
          tampering: true,
          overVoltage: true,
          underVoltage: true
        },
        timeOfUseSettings: {
          tariffSchedule: [
            { name: 'Peak', hours: ['07:00-09:00', '17:00-20:00'], days: [1, 2, 3, 4, 5] },
            { name: 'Shoulder', hours: ['09:00-17:00', '20:00-22:00'], days: [1, 2, 3, 4, 5] },
            { name: 'Off-peak', hours: ['22:00-07:00'], days: [1, 2, 3, 4, 5] },
            { name: 'Weekend', hours: ['00:00-24:00'], days: [0, 6] }
          ]
        }
      },
      isDefault: true
    },
    {
      deviceCatalogId: deviceMap.get('E660-D405'), // Landis+Gyr E660
      name: 'Commercial Advanced',
      description: 'Advanced configuration for commercial and industrial metering',
      configValues: {
        dataLoggingInterval: 5, // minutes
        loadProfileConfiguration: {
          channels: ['active_power_import', 'active_power_export', 'reactive_power_import', 'reactive_power_export', 'voltage_L1', 'voltage_L2', 'voltage_L3', 'current_L1', 'current_L2', 'current_L3'],
          interval: 5 // minutes
        },
        powerQualitySettings: {
          waveformCaptureTriggers: {
            voltageDeviation: 10, // percentage
            frequencyDeviation: 0.5 // hertz
          },
          harmonicAnalysisEnabled: true,
          sagsAndSwellsDetection: true,
          flickerMeasurement: true
        },
        communicationSettings: {
          primaryProtocol: 'DLMS/COSEM',
          secondaryProtocol: 'Modbus TCP',
          encryptionEnabled: true,
          authenticationEnabled: true
        },
        transformerSettings: {
          ctRatio: 100, // e.g., 100:5
          ptRatio: 1, // e.g., 1:1
          lossCompensationEnabled: true
        },
        demandSettings: {
          demandInterval: 15, // minutes
          slidingWindowEnabled: true,
          demandResetDay: 1 // 1st of month
        }
      },
      isDefault: true
    },
    
    // Heat Pump Presets
    {
      deviceCatalogId: deviceMap.get('EPGA-DV'), // Daikin Altherma 3
      name: 'Comfort Priority',
      description: 'Configuration prioritizing comfort over efficiency',
      configValues: {
        operationMode: 'heating_only',
        temperatureSettings: {
          heatingTargetTemp: 21, // Celsius
          dhwTargetTemp: 55 // Celsius
        },
        weatherCompensation: {
          enabled: true,
          heatCurveSlope: 1.5
        },
        quietModeSettings: {
          enabled: true,
          schedule: [
            { start: '22:00', end: '07:00', days: [0, 1, 2, 3, 4, 5, 6] }
          ]
        },
        defrostSettings: {
          mode: 'automatic'
        },
        smartGridSettings: {
          enabled: false
        },
        antiLegionella: {
          enabled: true,
          day: 1, // Monday
          time: '02:00', // 2 AM
          targetTemp: 65 // Celsius
        }
      },
      isDefault: true
    },
    {
      deviceCatalogId: deviceMap.get('EPGA-DV'), // Daikin Altherma 3
      name: 'Eco Priority',
      description: 'Configuration prioritizing energy efficiency',
      configValues: {
        operationMode: 'heating_only',
        temperatureSettings: {
          heatingTargetTemp: 19, // Celsius
          dhwTargetTemp: 50 // Celsius
        },
        weatherCompensation: {
          enabled: true,
          heatCurveSlope: 1.2
        },
        quietModeSettings: {
          enabled: true,
          schedule: [
            { start: '22:00', end: '07:00', days: [0, 1, 2, 3, 4, 5, 6] }
          ]
        },
        defrostSettings: {
          mode: 'automatic'
        },
        smartGridSettings: {
          enabled: true,
          overrideEnabled: true
        },
        antiLegionella: {
          enabled: true,
          day: 1, // Monday
          time: '02:00', // 2 AM
          targetTemp: 60 // Celsius
        },
        scheduleSettings: {
          enabled: true,
          schedule: [
            { start: '06:00', end: '08:00', temp: 20, days: [1, 2, 3, 4, 5] },
            { start: '16:00', end: '22:00', temp: 20, days: [1, 2, 3, 4, 5] },
            { start: '08:00', end: '16:00', temp: 18, days: [1, 2, 3, 4, 5] },
            { start: '22:00', end: '06:00', temp: 17, days: [1, 2, 3, 4, 5] },
            { start: '08:00', end: '22:00', temp: 20, days: [0, 6] },
            { start: '22:00', end: '08:00', temp: 18, days: [0, 6] }
          ]
        }
      },
      isDefault: false
    },
    {
      deviceCatalogId: deviceMap.get('EGSAH-D'), // Daikin Altherma 3 GEO
      name: 'Geothermal Standard',
      description: 'Standard configuration for geothermal heat pump',
      configValues: {
        operationMode: 'heating_only',
        temperatureSettings: {
          heatingTargetTemp: 21, // Celsius
          dhwTargetTemp: 55 // Celsius
        },
        weatherCompensation: {
          enabled: true,
          heatCurveSlope: 0.7 // flatter for geothermal
        },
        brineSettings: {
          brineType: 'ethylene glycol',
          brineConcentration: 30, // percentage
          minBrineTemperature: -10 // Celsius
        },
        backupHeaterSettings: {
          usageMode: 'emergency_and_peak_load',
          stages: 3
        },
        smartGridSettings: {
          enabled: true,
          overrideEnabled: true
        },
        antiLegionella: {
          enabled: true,
          day: 1, // Monday
          time: '02:00', // 2 AM
          targetTemp: 60 // Celsius
        },
        scheduleSettings: {
          enabled: true,
          schedule: [
            { start: '06:00', end: '22:00', temp: 21, days: [1, 2, 3, 4, 5] },
            { start: '22:00', end: '06:00', temp: 19, days: [1, 2, 3, 4, 5] },
            { start: '08:00', end: '22:00', temp: 21, days: [0, 6] },
            { start: '22:00', end: '08:00', temp: 19, days: [0, 6] }
          ]
        }
      },
      isDefault: true
    },
    
    // Gateway Presets
    {
      deviceCatalogId: deviceMap.get('IR1101-K9'), // Cisco IR1101
      name: 'Standard Edge Gateway',
      description: 'Standard configuration for edge gateway deployment',
      configValues: {
        networkSettings: {
          ipAddress: 'dhcp',
          subnetMask: '255.255.255.0',
          defaultGateway: 'auto',
          dnsServers: ['8.8.8.8', '8.8.4.4']
        },
        securitySettings: {
          firewallEnabled: true,
          dpiEnabled: true,
          ipsEnabled: true,
          tlsInspectionEnabled: false,
          remoteAccessEnabled: true,
          remoteAccessProtocols: ['SSH', 'HTTPS']
        },
        routingSettings: {
          staticRoutes: [],
          dynamicRoutingProtocols: ['OSPF']
        },
        deviceManagement: {
          snmpEnabled: true,
          snmpVersion: '3',
          ntp: {
            enabled: true,
            servers: ['pool.ntp.org']
          },
          syslog: {
            enabled: true,
            localStorageDays: 30,
            remoteServer: ''
          }
        },
        wirelessSettings: {
          cellularEnabled: true,
          cellularApn: 'internet',
          wifiEnabled: false
        }
      },
      isDefault: true
    },
    {
      deviceCatalogId: deviceMap.get('IC3000-2C2D-K9'), // Cisco IC3000
      name: 'Edge Compute Node',
      description: 'Configuration for edge computing with containerized applications',
      configValues: {
        networkSettings: {
          ipAddress: 'dhcp',
          subnetMask: '255.255.255.0',
          defaultGateway: 'auto',
          dnsServers: ['8.8.8.8', '8.8.4.4']
        },
        securitySettings: {
          firewallEnabled: true,
          dpiEnabled: false,
          ipsEnabled: false,
          tlsInspectionEnabled: false,
          remoteAccessEnabled: true,
          remoteAccessProtocols: ['SSH', 'HTTPS']
        },
        containerSettings: {
          dockerEnabled: true,
          maxContainers: 10,
          persistentStorage: '/data',
          resourceLimits: {
            cpuLimit: 80, // percentage
            memoryLimit: 70, // percentage
            storageLimit: 80 // percentage
          },
          autoRestart: true
        },
        deviceManagement: {
          snmpEnabled: true,
          snmpVersion: '3',
          ntp: {
            enabled: true,
            servers: ['pool.ntp.org']
          },
          syslog: {
            enabled: true,
            localStorageDays: 30,
            remoteServer: ''
          }
        },
        industrialProtocols: {
          modbusEnabled: true,
          opcUaEnabled: true,
          mqttEnabled: true,
          mqttBroker: {
            enabled: false
          }
        }
      },
      isDefault: true
    }
  ];
  
  const insertedPresets = [];
  const updatedPresets = [];
  
  // For each preset, check if it already exists
  for (const preset of presets) {
    // Create a unique key for the preset
    const key = `${preset.deviceCatalogId}-${preset.name}`;
    
    // Check if this preset already exists
    if (existingPresetMap.has(key)) {
      // If it exists, update it
      try {
        const existingPreset = existingPresetMap.get(key);
        const [updatedPreset] = await db
          .update(deviceCatalogPresets)
          .set({
            ...preset,
            updatedAt: new Date()
          })
          .where(sql`${deviceCatalogPresets.id} = ${existingPreset.id}`)
          .returning();
        
        updatedPresets.push(updatedPreset);
      } catch (error) {
        console.error(`Error updating preset ${preset.name} for device ID ${preset.deviceCatalogId}:`, error.message);
      }
    } else {
      // If it doesn't exist, insert it
      try {
        const [insertedPreset] = await db.insert(deviceCatalogPresets).values(preset).returning();
        insertedPresets.push(insertedPreset);
      } catch (error) {
        console.error(`Error inserting preset ${preset.name} for device ID ${preset.deviceCatalogId}:`, error.message);
      }
    }
  }
  
  console.log(`Inserted ${insertedPresets.length} new configuration presets, updated ${updatedPresets.length} existing ones`);
  
  return [...insertedPresets, ...updatedPresets];
}

// Execute the seed function
seedDeviceData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });