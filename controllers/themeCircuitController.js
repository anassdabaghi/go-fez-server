const { ThemeCircuit, Circuit, Theme } = require('../models');

exports.addThemeToCircuit = async (req, res) => {
  try {
    const { circuitId, themeId } = req.body;

    const link = await ThemeCircuit.create({ circuitId, themeId });
    res.status(201).json({ status: 'success', data: link });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Erreur serveur', error });
  }
};

exports.getAllThemeCircuits = async (req, res) => {
  try {
    const links = await ThemeCircuit.findAll({
      include: [
        { model: Circuit, as: 'circuit' },
        { model: Theme, as: 'theme' }
      ]
    });
    res.status(200).json({ status: 'success', data: links });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Erreur serveur', error });
  }
};

exports.deleteThemeCircuit = async (req, res) => {
  try {
    const { id } = req.params;
    const link = await ThemeCircuit.findByPk(id);
    if (!link)
      return res.status(404).json({ status: 'fail', message: 'Relation non trouvée' });

    await link.destroy();
    res.status(204).json({ status: 'success', message: 'Relation supprimée' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Erreur serveur', error });
  }
};
