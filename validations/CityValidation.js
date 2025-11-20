const Joi = require('joi');

const AddressLocalizationSchema = Joi.object({
    address: Joi.string().max(255).required(),
    addressAr: Joi.string().max(255).required(),
    addressEn: Joi.string().max(255).required(),
    longitude: Joi.number().precision(6).required(), 
    latitude: Joi.number().precision(6).required(),  
}).required();

const createCitySchema = Joi.object({
    name: Joi.string().max(255).required().messages({
        'any.required': 'name is required',
        'string.max': 'Name must be at most 255 characters long',
    }),
    nameAr: Joi.string().max(255).required().messages({
        'any.required': 'Name in Arabic is required.',
    }),
    nameEn: Joi.string().max(255).required().messages({
        'any.required': 'Name in English is required.',
    }),
    country: Joi.string().max(100).required().messages({
        'any.required': 'country is required',
    }),
    coordinates: AddressLocalizationSchema,
    radius: Joi.number().positive().min(1).required().messages({
        'any.required': 'Radius is required.',
        'number.min': '  Radius must be at least 1',
    }),
    isActive: Joi.boolean().default(true), 
});

const updateCitySchema = Joi.object({
    name: Joi.string().max(255).optional(),
    nameAr: Joi.string().max(255).optional(),
    nameEn: Joi.string().max(255).optional(),
    country: Joi.string().max(100).optional(),
    coordinates: AddressLocalizationSchema.optional(),
    radius: Joi.number().positive().min(1).optional(),
    isActive: Joi.boolean().optional(),
    createdAt: Joi.forbidden(), 
    updatedAt: Joi.forbidden(),
});


module.exports = {
    createCitySchema,
    updateCitySchema,
};