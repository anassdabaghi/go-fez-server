const express = require("express");

const ConfigRouter = express.Router();

ConfigRouter.get("/health", (req, res) => {
	const { address, port } = req.socket.server.address();
	res.json({
		status: "ok",
		message: `${address}:${port} is running`,
		host: address,
		port: port,
	});
});

module.exports = { ConfigRouter };
