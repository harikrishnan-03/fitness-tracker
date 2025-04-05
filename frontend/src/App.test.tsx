import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('Header Component', () => {
  it('should render the application title', () => {
    render(<App />);
    // Looks for the text 'Fitness Tracker'
    const titleElement = screen.getByText(/Fitness Tracker/i); 
    expect(titleElement).toBeInTheDocument();
  });

});