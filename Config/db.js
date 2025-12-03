const { Sequelize } = require("sequelize");
require("dotenv").config();
const logger = require('./logger'); 
// Créer une seule instance de Sequelize pour garantir une connexion unique
class Database {
	// host contructor
	constructor() {
		if (!Database.instance) {
			this.sequelize = new Sequelize(
				process.env.DB_NAME,
				process.env.DB_USER,
				process.env.DB_PASSWORD,
				{
					host: process.env.DB_HOST,
					dialect: "mysql",
					dialectOptions: {
						connectTimeout: 10000, // Temps d'attente en millisecondes (ici 10 secondes)
					},
					logging: false,
					port: process.env.DB_PORT,
					pool: {
						max: 5,
						min: 0,
						acquire: 30000,
						idle: 10000,
					},
				}
			);
			Database.instance = this;
		}

		return Database.instance;
	}

	// Méthode pour nettoyer les données orphelines avant la synchronisation
	async cleanOrphanedData() {
		try {
			logger.info("Nettoyage des données orphelines...");
			
			// Récupérer tous les IDs d'utilisateurs valides
			const validUserIds = await this.sequelize.query(
				"SELECT id FROM users",
				{ type: this.sequelize.QueryTypes.SELECT }
			);
			const userIdSet = new Set(validUserIds.map((u) => u.id));
			
			if (userIdSet.size === 0) {
				logger.warn("Aucun utilisateur trouvé dans la base de données. Le nettoyage sera ignoré.");
				return;
			}
			
			// Liste des tables avec clés étrangères vers users
			// Format: { table: 'nom_table_dans_bdd', foreignKey: 'nom_colonne_dans_bdd' }
			const tablesToClean = [
				{ table: 'CircuitProgress', foreignKey: 'userId' },
				{ table: 'CustomCircuits', foreignKey: 'userId' },
				{ table: 'shares', foreignKey: 'userId' },
				{ table: 'favorite_poi', foreignKey: 'user_id' },
				{ table: 'routes', foreignKey: 'userId' },
				{ table: 'removed_traces', foreignKey: 'userId' },
				{ table: 'albums', foreignKey: 'userId' },
				{ table: 'UserBadges', foreignKey: 'userId' },
				{ table: 'points_transactions', foreignKey: 'user_id' },
				{ table: 'reviews', foreignKey: 'userId' },
				{ table: 'user_spaces', foreignKey: 'user_id' },
			];
			
			let totalDeleted = 0;
			
			for (const { table, foreignKey } of tablesToClean) {
				try {
					// Vérifier si la table existe
					const tableExistsResult = await this.sequelize.query(
						`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${table}'`,
						{ type: this.sequelize.QueryTypes.SELECT }
					);
					
					if (tableExistsResult && Array.isArray(tableExistsResult) && tableExistsResult.length > 0 && tableExistsResult[0].count > 0) {
						// Vérifier si la colonne existe
						const columnExistsResult = await this.sequelize.query(
							`SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = '${table}' AND column_name = '${foreignKey}'`,
							{ type: this.sequelize.QueryTypes.SELECT }
						);
						
						if (columnExistsResult && Array.isArray(columnExistsResult) && columnExistsResult.length > 0 && columnExistsResult[0].count > 0) {
							// Supprimer les enregistrements orphelins en utilisant LEFT JOIN
							const deleteResult = await this.sequelize.query(
								`DELETE t FROM \`${table}\` t LEFT JOIN users u ON t.\`${foreignKey}\` = u.id WHERE u.id IS NULL`,
								{ type: this.sequelize.QueryTypes.DELETE }
							);
							
							// Le format de retour de Sequelize pour DELETE: [results, metadata]
							// metadata contient affectedRows
							let deletedCount = 0;
							if (Array.isArray(deleteResult) && deleteResult.length >= 2) {
								const metadata = deleteResult[1];
								deletedCount = metadata?.affectedRows || 0;
							} else if (deleteResult && typeof deleteResult === 'object' && 'affectedRows' in deleteResult) {
								deletedCount = deleteResult.affectedRows || 0;
							}
							
							if (deletedCount > 0) {
								logger.info(`Supprimé ${deletedCount} enregistrement(s) orphelin(s) de la table ${table}`);
								totalDeleted += deletedCount;
							}
						}
					}
				} catch (tableError) {
					// Ignorer les erreurs pour les tables qui n'existent pas encore
					const errorMessage = tableError?.message || '';
					if (!errorMessage.includes("doesn't exist") && !errorMessage.includes("Unknown table")) {
						logger.warn(`Erreur lors du nettoyage de la table ${table}: ${errorMessage}`);
					}
				}
			}
			
			if (totalDeleted > 0) {
				logger.info(`Nettoyage terminé: ${totalDeleted} enregistrement(s) orphelin(s) supprimé(s)`);
			} else {
				logger.info("Aucune donnée orpheline trouvée.");
			}
		} catch (error) {
			logger.error("Erreur lors du nettoyage des données orphelines:", error);
			// Ne pas bloquer la synchronisation en cas d'erreur de nettoyage
		}
	}

	// Méthode pour initialiser la connexion à la base de données
	async initializeDatabase() {
		try {
			await this.sequelize.authenticate();
			logger.info("Connexion à la base de données réussie !"); 
			if(process.env.ASYNC_DB === 'true') {
				// Nettoyer les données orphelines avant la synchronisation
				// await this.cleanOrphanedData();
				
				await this.sequelize.sync({ alter: true })
			 .then(() => {
			   logger.info("Database synchronized"); 
			   })
			   .catch((error) => {
				   logger.error("Error synchronizing the database:", error);
			   });
			}
		} catch (error) {
			logger.error("Erreur lors de la connexion à la base de données :", error); // <-- Use logger
			throw error;
		}
	}

	async closeDatabase() {
		try {
			await this.sequelize.close();
logger.info("Connexion à la base de données fermée !"); 
		} catch (error) {
logger.error(
				"Erreur lors de la fermeture de la connexion :", // <-- Use logger
				error
			);
			throw error;
		}
	}

	// Accéder à l'instance de Sequelize
	getSequelize() {
		return this.sequelize;
	}

	// Suppression de l'index "email" sur la table "clients"
	async dropPhoneIndex() {
		try {
			await this.sequelize.query(
				"ALTER TABLE `users` DROP INDEX `phone`;"
			);
			console.log("✅ Index 'phone' supprimé avec succès.");
		} catch (error) {
			console.error(
				"❌ Erreur lors de la suppression de l'index 'phone' :",
				error
			);
		}
	}

	async dropPrimaryIdentifierIndex() {
		try {
			await this.sequelize.query(
				"ALTER TABLE `users` DROP INDEX `primary_identifier`;"
			);
			console.log("✅ Index 'primary_identifier' supprimé avec succès.");
		} catch (error) {
			console.error(
				"❌ Erreur lors de la suppression de l'index 'primary_identifier' :",
				error
			);
		}
	}

	async dropFacebookIdIndex() {
		try {
			await this.sequelize.query(
				"ALTER TABLE `users` DROP INDEX `facebook_id`;"
			);
			console.log("✅ Index 'facebook_id' supprimé avec succès.");
		} catch (error) {
			console.error(
				"❌ Erreur lors de la suppression de l'index 'facebook_id' :",
				error
			);
		}
	}

	async dropGoogleIdIndex() {
		try {
			await this.sequelize.query(
				"ALTER TABLE `users` DROP INDEX `google_id`;"
			);
			console.log("✅ Index 'google_id' supprimé avec succès.");
		} catch (error) {
			console.error(
				"❌ Erreur lors de la suppression de l'index 'google_id' :",
				error
			);
		}
	}

	// Méthode pour tout supprimer en appelant les méthodes individuelles
	async dropAllIndexes() {
		await this.dropPhoneIndex();
		await this.dropPrimaryIdentifierIndex();
		await this.dropFacebookIdIndex();
		await this.dropGoogleIdIndex();
		console.log("✅ Tous les index ont été supprimés.");
	}
}

module.exports = new Database();
