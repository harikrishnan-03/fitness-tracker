import { useState } from 'react';
import './App.css';

function App() {
  const [caloriesConsumed, setCaloriesConsumed] = useState('2000');
  const [caloriesError, setCaloriesError] = useState('');
  const [dietaryGoal, setDietaryGoal] = useState('weight_loss');
  const [includeMealPlan, setIncludeMealPlan] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCaloriesChange = (e: any) => {
    const value = e.target.value;

    // Allow empty input for typing or only numbers
    if (value === '' || /^\d+$/.test(value)) {
      setCaloriesConsumed(value);

      // Validate the range (optional)
      if (value !== '' && (parseInt(value, 10) < 500 || parseInt(value, 10) > 10000)) {
        setCaloriesError('Please enter a value between 500 and 10000 calories');
      } else {
        setCaloriesError('');
      }
    }
  };

  const validateForm = () => {
    let isValid = true;

    // Validate calories
    if (!caloriesConsumed || caloriesConsumed === '') {
      setCaloriesError('Calories field is required');
      isValid = false;
    } else if (!/^\d+$/.test(caloriesConsumed)) {
      setCaloriesError('Calories must be a valid number');
      isValid = false;
    } else if (parseInt(caloriesConsumed, 10) < 500 || parseInt(caloriesConsumed, 10) > 10000) {
      setCaloriesError('Please enter a value between 500 and 10000 calories');
      isValid = false;
    } else {
      setCaloriesError('');
    }

    return isValid;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setMealPlan(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_FITNESS_API_URL}/fitness/workout-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caloriesConsumed: parseInt(caloriesConsumed, 10),
          dietaryGoal,
          includeMealPlan
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get recommendations');
      }

      setRecommendations(data.recommendations);

      // If meal plan was requested and received, set it
      if (includeMealPlan && data.mealPlan) {
        setMealPlan(data.mealPlan);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Fitness Tracker</h1>
        <p>Get personalized workout recommendations based on your caloric intake</p>
      </header>

      <main>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="calories">Calories Consumed Today:</label>
            <input
              type="text"
              id="calories"
              value={caloriesConsumed}
              onChange={handleCaloriesChange}
              className={caloriesError ? 'error-input' : ''}
              placeholder="Enter calories (e.g. 2000)"
              required
            />
            {caloriesError && <div className="input-error">{caloriesError}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="goal">Dietary Goal:</label>
            <select
              id="goal"
              value={dietaryGoal}
              onChange={(e) => setDietaryGoal(e.target.value)}
            >
              <option value="weight_loss">Weight Loss</option>
              <option value="muscle_gain">Muscle Gain</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={includeMealPlan}
                onChange={(e) => setIncludeMealPlan(e.target.checked)}
              />
              Include Meal Plan Recommendations
            </label>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'Get Workout Recommendations'}
          </button>
        </form>

        {error && <div className="error">{error}</div>}

        {recommendations.length > 0 && (
          <div className="recommendations">
            <h2>Your Workout Recommendations</h2>
            {recommendations.map((rec: any, index) => (
              <div key={index} className="recommendation-card">
                <h3>{rec.workoutType}</h3>
                <p><strong>Duration:</strong> {rec.durationMinutes} minutes</p>
                <p><strong>Intensity:</strong> {rec.intensity}</p>
                <p><strong>Calories Burned:</strong> ~{rec.estimatedCaloriesBurned}</p>
                <p>{rec.description}</p>
              </div>
            ))}
          </div>
        )}

        {mealPlan && (
          <div className="meal-plan">
            <h2>Complementary Meal Plan</h2>
            <p className="total-calories">
              <strong>Total Calories:</strong> {mealPlan.totalCalories}
            </p>

            <div className="meals-container">
              {mealPlan.meals.map((meal: any, index: any) => (
                <div key={index} className="meal-card">
                  <h3>{meal.meal}</h3>
                  <p className="meal-calories">{meal.calories} calories</p>
                  <div className="ingredients">
                    <h4>Ingredients:</h4>
                    <ul>
                      {meal.ingredients.map((ingredient: any, i: any) => (
                        <li key={i}>{ingredient}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default App;