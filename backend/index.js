const axios = require('axios');

exports.handler = async (event) => {
  try {
    // Parse request body
    const body = event;

    const { caloriesConsumed, dietaryGoal, includeMealPlan = false } = body;

    // Basic validation
    if (!caloriesConsumed || !dietaryGoal) {
      return formatResponse({ error: 'Missing required parameters' });
    }

    // Get weather data to determine indoor/outdoor activities
    const weatherData = await getWeatherData();

    // Get nutrition data from Nutrition Planner API
    let nutritionData = null;
    if (includeMealPlan) {
      nutritionData = await getNutritionData(caloriesConsumed, dietaryGoal);
    } else {
      // Use default nutrition ratios when not fetching from API
      nutritionData = {
        totalCalories: caloriesConsumed,
        proteinRatio: 0.3,
        carbRatio: 0.4,
        fatRatio: 0.3,
      };
    }

    // Generate workout recommendations based on calories, goals, and weather
    const recommendations = generateWorkoutRecommendations(
      caloriesConsumed,
      dietaryGoal,
      weatherData,
      nutritionData,
    );

    // Prepare response with recommendations and meal plan if available
    const response = { recommendations };
    if (nutritionData && nutritionData.meals) {
      response.mealPlan = nutritionData;
    }

    return formatResponse(response);
  } catch (error) {
    console.error('Error:', error);
    return formatResponse({ error: 'Internal server error' });
  }
};

async function getWeatherData() {
  try {
    // OpenWeatherMap API call
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=53.3489&lon=-6.2432&appid=${apiKey}&units=metric`;

    const response = await axios.get(url);
    return {
      temperature: response.data.main.temp,
      weatherCondition: response.data.weather[0].main,
      isGoodForOutdoor: ['Clear', 'Clouds', 'Few clouds'].includes(response.data.weather[0].main),
    };
  } catch (error) {
    console.error('Weather API error:', error);
    // Return default data if API fails
    return {
      temperature: 20,
      weatherCondition: 'Unknown',
      isGoodForOutdoor: true,
    };
  }
}

async function getNutritionData(caloriesConsumed, dietaryGoal) {
  try {
    const url = process.env.NUTRITION_PLANNER_API_URL;
    const dietMapping = {
      weight_loss: 'balanced',
      muscle_gain: 'high_protein',
      maintenance: 'balanced',
    };

    const response = await axios.post(`${url}/meal-plans`, {
      calories: caloriesConsumed,
      dietaryPreference: dietMapping[dietaryGoal] || 'balanced',
    });

    return response.data;
  } catch (error) {
    console.error('Nutrition API error:', error);
    // Return default data if API fails
    return {
      totalCalories: caloriesConsumed,
      proteinRatio: 0.3,
      carbRatio: 0.4,
      fatRatio: 0.3,
    };
  }
}

function generateWorkoutRecommendations(calories, goal, weather, nutrition) {
  const recommendations = [];

  // Add cardio recommendation
  if (weather.isGoodForOutdoor) {
    recommendations.push({
      workoutType: 'cycling',
      durationMinutes: 45,
      estimatedCaloriesBurned: 500,
      intensity: goal === 'weight_loss' ? 'high' : 'moderate',
      description: `Outdoor cycling session. Current weather: ${weather.weatherCondition}, ${weather.temperature}°C.`,
    });
  } else {
    recommendations.push({
      workoutType: 'treadmill',
      durationMinutes: 30,
      estimatedCaloriesBurned: 350,
      intensity: goal === 'weight_loss' ? 'high' : 'moderate',
      description: 'Indoor treadmill run. Weather not ideal for outdoor activities.',
    });
  }

  // Add strength training based on nutrition
  if (nutrition.proteinRatio > 0.25 || goal === 'muscle_gain') {
    recommendations.push({
      workoutType: 'strength training',
      durationMinutes: 40,
      estimatedCaloriesBurned: 300,
      intensity: 'moderate',
      description: 'Full-body strength workout focusing on major muscle groups.',
    });
  }

  // Add HIIT for weight loss
  if (goal === 'weight_loss') {
    recommendations.push({
      workoutType: 'HIIT',
      durationMinutes: 20,
      estimatedCaloriesBurned: 300,
      intensity: 'high',
      description: 'High-intensity interval training to maximize calorie burn.',
    });
  }

  return recommendations;
}

function formatResponse(body) {
  return body;
}
