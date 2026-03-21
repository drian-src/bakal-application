'use strict';

const { supabase } = require('../config/db');
const logger = require('../config/logger');
const productRepo = require('../repositories/productRepository');

async function getCategories(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, description')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return res.status(200).json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
}

async function getProductsByCategory(req, res, next) {
  try {
    const { categoryId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    
    if (page < 1) {
      return res.status(400).json({ success: false, message: 'Page must be >= 1' });
    }

    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'Category ID is required' });
    }

    // Verify category exists
    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', categoryId)
      .maybeSingle();
    
    if (catError) throw catError;
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Fetch products in this category with pagination
    const offset = (page - 1) * limit;
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*, platforms(name)')
      .eq('category_id', categoryId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });
    
    if (prodError) throw prodError;

    return res.status(200).json({ success: true, data: products || [] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCategories,
  getProductsByCategory,
};
