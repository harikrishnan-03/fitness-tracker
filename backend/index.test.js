// index.test.js
const { handler } = require('./index'); 
const axios = require('axios'); 

process.env.OPENWEATHER_API_KEY = 'test-weather-key';
process.env.NUTRITION_PLANNER_API_URL = 'http://test-nutrition-api.com';

jest.mock('axios'); 

describe('Fitness Backend Handler', () => {

  // Reset mocks before each test
  beforeEach(() => {
    axios.get.mockClear();
    axios.post.mockClear();
  });

  it('should return recommendations for weight loss with good weather', async () => {
    // Mock successful API responses
    axios.get.mockResolvedValueOnce({ // Weather API mock
      data: {
        main: { temp: 22 },
        weather: [{ main: 'Clear' }]
      }
    });
    // No meal plan requested, so no POST mock needed for this specific test

    const event = {
      caloriesConsumed: 2000,
      dietaryGoal: 'weight_loss',
      includeMealPlan: false
    };

    const result = await handler(event);

    expect(axios.get).toHaveBeenCalledTimes(1); // Weather API called
    expect(axios.post).not.toHaveBeenCalled();  // Nutrition API not called
    expect(result).toBeDefined();
    expect(result.recommendations).toBeInstanceOf(Array);
    expect(result.recommendations.length).toBeGreaterThan(0);
    // Check for specific outdoor activity due to 'Clear' weather
    expect(result.recommendations.some(rec => rec.workoutType === 'cycling')).toBe(true); 
    expect(result.recommendations.some(rec => rec.workoutType === 'HIIT')).toBe(true); // HIIT for weight loss
    expect(result.mealPlan).toBeUndefined();
  });

  it('should return recommendations and meal plan for muscle gain', async () => {
    // Mock successful API responses
    axios.get.mockResolvedValueOnce({ // Weather API mock
      data: {
        main: { temp: 10 },
        weather: [{ main: 'Rain' }]
      }
    });
    axios.post.mockResolvedValueOnce({ // Nutrition API mock
      data: {
        totalCalories: 2500,
        proteinRatio: 0.4,
        carbRatio: 0.4,
        fatRatio: 0.2,
        meals: [ /* Sample meal data */ ]
      }
    });

    const event = {
      caloriesConsumed: 2500,
      dietaryGoal: 'muscle_gain',
      includeMealPlan: true
    };

    const result = await handler(event);

    expect(axios.get).toHaveBeenCalledTimes(1); // Weather API called
    expect(axios.post).toHaveBeenCalledTimes(1); // Nutrition API called
    expect(axios.post).toHaveBeenCalledWith(
      `${process.env.NUTRITION_PLANNER_API_URL}/meal-plans`, 
      { calories: 2500, dietaryPreference: 'high_protein' }
    ); 
    expect(result).toBeDefined();
    expect(result.recommendations).toBeInstanceOf(Array);
    // Check for indoor activity due to 'Rain'
    expect(result.recommendations.some(rec => rec.workoutType === 'treadmill')).toBe(true); 
    expect(result.recommendations.some(rec => rec.workoutType === 'strength training')).toBe(true); // Strength for muscle gain
    expect(result.mealPlan).toBeDefined();
    expect(result.mealPlan.totalCalories).toBe(2500);
  });

  it('should return 400 if required parameters are missing', async () => {
    const event = {
      // missing caloriesConsumed and dietaryGoal
    };

    const result = await handler(event);

    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
    expect(result).toEqual({ error: 'Missing required parameters' }); 
    // Note: Your formatResponse function directly returns the body, 
    // so we check the body directly, not a typical API Gateway structure. Adjust if needed.
  });

  it('should handle weather API failure gracefully', async () => {
    axios.get.mockRejectedValueOnce(new Error('Weather API down')); // Simulate weather API error

    const event = {
      caloriesConsumed: 1800,
      dietaryGoal: 'maintenance',
      includeMealPlan: false
    };

    const result = await handler(event);

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.post).not.toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.recommendations).toBeInstanceOf(Array);
    // Check if it defaulted to an outdoor activity despite API error (as per current logic)
    expect(result.recommendations.some(rec => rec.workoutType === 'cycling')).toBe(true); 
    // Check if strength training is included (protein ratio defaults to 0.3 in error case)
    expect(result.recommendations.some(rec => rec.workoutType === 'strength training')).toBe(true); 
  });

  it('should handle nutrition API failure gracefully when meal plan requested', async () => {
    axios.get.mockResolvedValueOnce({ // Weather API mock (good weather)
      data: {
        main: { temp: 25 },
        weather: [{ main: 'Clear' }]
      }
    });
    axios.post.mockRejectedValueOnce(new Error('Nutrition API down')); // Simulate nutrition API error

    const event = {
      caloriesConsumed: 2200,
      dietaryGoal: 'weight_loss',
      includeMealPlan: true // Meal plan is requested
    };

    const result = await handler(event);

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
    expect(result.recommendations).toBeInstanceOf(Array);
    // Check recommendations are still generated based on defaults
    expect(result.recommendations.some(rec => rec.workoutType === 'cycling')).toBe(true); 
    expect(result.recommendations.some(rec => rec.workoutType === 'strength training')).toBe(true); // Default protein > 0.25
    expect(result.recommendations.some(rec => rec.workoutType === 'HIIT')).toBe(true); 
    expect(result.mealPlan).toBeUndefined(); // Meal plan should not be included
  });
});