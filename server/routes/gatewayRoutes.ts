import express from 'express';
import * as gatewayController from '../controllers/gatewayController';
import { requireAdmin, requireManager } from '../middleware/roleAuth';

const router = express.Router();

// Gateway routes

// GET all gateways
router.get('/', gatewayController.getAllGateways);

// GET gateway by ID
router.get('/:id', gatewayController.getGatewayById);

// CREATE new gateway
router.post('/', requireManager, gatewayController.createGateway);

// CREATE gateway configuration for a device
router.post('/:id/config', requireManager, gatewayController.createGatewayConfig);

// GET devices connected to gateway
router.get('/:id/devices', gatewayController.getConnectedDevices);

// CONNECT device to gateway
router.post('/:id/connect/:deviceId', requireManager, gatewayController.connectDevice);

// DISCONNECT device from gateway
router.delete('/:id/disconnect/:deviceId', requireManager, gatewayController.disconnectDevice);

// TEST gateway connection
router.post('/:id/test-connection', gatewayController.testGatewayConnection);

// GENERATE credentials for gateway
router.post('/generate-credentials', gatewayController.generateCredentials);

// UPDATE gateway status
router.put('/:id/status', requireManager, gatewayController.updateGatewayStatus);

export default router;