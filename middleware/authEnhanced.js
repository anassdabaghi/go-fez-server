const jwt = require('jsonwebtoken');
const { User } = require('../models/User.js');
// const logger = require('../utils/logger.js'); // Remplacé par console.log
const path = require('path');
require('dotenv').config();

// Configuration JWT (alignée sur authService avec fallback)
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * 🔐 Middleware d'authentification JWT amélioré
 * Supporte les tokens depuis les cookies ET les headers Authorization
 */

const authenticateToken = async (req, res, next) => {
    try {
        let token = null;

        // 1. Essayer de récupérer le token depuis le cookie (méthode principale)
        if (req.cookies && req.cookies.tk) {
            token = req.cookies.tk;
            console.log('Token récupéré depuis le cookie');
        }
        
        // 2. Si pas de cookie, essayer depuis le header Authorization
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.substring(7); // Enlever "Bearer "
            console.log('Token récupéré depuis le header Authorization');
        }
        
        // 3. Si pas de header Authorization, essayer depuis le header 'token'
        else if (req.headers.token) {
            token = req.headers.token;
            console.log('Token récupéré depuis le header token');
        }

        if (!token) {
            console.log('Aucun token trouvé dans la requête', {
                hasCookies: !!req.cookies,
                hasAuthHeader: !!req.headers.authorization,
                hasTokenHeader: !!req.headers.token,
                cookies: req.cookies ? Object.keys(req.cookies) : [],
                headers: {
                    authorization: req.headers.authorization ? 'Present' : 'Missing',
                    token: req.headers.token ? 'Present' : 'Missing'
                }
            });
            
            return res.status(401).json({
                success: false,
                error: 'Token d\'accès requis',
                code: 'TOKEN_MISSING',
                debug: {
                    hasCookies: !!req.cookies,
                    hasAuthHeader: !!req.headers.authorization,
                    hasTokenHeader: !!req.headers.token,
                    cookieKeys: req.cookies ? Object.keys(req.cookies) : []
                }
            });
        }

        // Vérification du token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Vérification que l'utilisateur existe toujours
        const user = await User.findByPk(decoded.userId);
        if (!user) {
            console.log('Utilisateur non trouvé pour le token', { userId: decoded.userId });
            return res.status(401).json({
                success: false,
                error: 'Utilisateur non trouvé',
                code: 'USER_NOT_FOUND'
            });
        }

        // Ajout des informations utilisateur à la requête
        req.user = {
            userId: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role,
            primaryIdentifier: user.primaryIdentifier,
            authProvider: user.authProvider
        };

        console.log('Authentification réussie', { userId: user.id });
        next();

    } catch (error) {
        console.log('Erreur d\'authentification:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Token invalide',
                code: 'TOKEN_INVALID',
                debug: {
                    errorName: error.name,
                    errorMessage: error.message
                }
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expiré',
                code: 'TOKEN_EXPIRED',
                debug: {
                    errorName: error.name,
                    expiredAt: error.expiredAt
                }
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Erreur d\'authentification',
            code: 'AUTH_ERROR',
            debug: {
                errorName: error.name,
                errorMessage: error.message
            }
        });
    }
};

/**
 * 🔄 Middleware optionnel d'authentification amélioré
 * N'échoue pas si le token est absent, mais ajoute les infos si présent
 */
const optionalAuth = async (req, res, next) => {
    try {
        let token = null;

        // Essayer de récupérer le token depuis différentes sources
        if (req.cookies && req.cookies.tk) {
            token = req.cookies.tk;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.substring(7);
        } else if (req.headers.token) {
            token = req.headers.token;
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const user = await User.findByPk(decoded.userId);
                
                if (user) {
                    req.user = {
                        userId: decoded.userId,
                        email: decoded.email,
                        role: decoded.role,
                        primaryIdentifier: decoded.primaryIdentifier,
                        authProvider: decoded.authProvider
                    };
                    console.log('Authentification optionnelle réussie', { userId: decoded.userId });
                }
            } catch (tokenError) {
                // Token invalide, mais on continue sans authentification
                console.log('Token invalide dans optionalAuth:', tokenError.message);
            }
        }

        next();

    } catch (error) {
        console.log('Erreur dans optionalAuth:', error);
        next(); // Continue même en cas d'erreur
    }
};

module.exports = {
    authenticateToken,
    optionalAuth
};
