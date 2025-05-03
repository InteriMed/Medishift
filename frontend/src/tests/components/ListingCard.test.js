import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ListingCard from '../../dashboard/components/ListingCard/ListingCard';

const mockJobListing = {
  id: '1',
  title: 'Pharmacist Position',
  location: 'Zurich, Switzerland',
  employer_name: 'ABC Pharmacy',
  salary_range: 'CHF 80,000 - 100,000',
  requirements: ['License', 'Min 2 years experience']
};

const mockPharmacistListing = {
  id: '2',
  pharmacist_id: '12345',
  preferred_location: 'Geneva, Switzerland',
  specialties: ['Hospital', 'Clinical'],
  hourly_rate: 85,
  verified: true
};

describe('ListingCard Component', () => {
  test('renders job listing correctly', () => {
    render(<ListingCard listing={mockJobListing} onClick={() => {}} />);
    
    expect(screen.getByText('Pharmacist Position')).toBeInTheDocument();
    expect(screen.getByText('Zurich, Switzerland')).toBeInTheDocument();
    expect(screen.getByText('ABC Pharmacy')).toBeInTheDocument();
    expect(screen.getByText('CHF 80,000 - 100,000')).toBeInTheDocument();
  });
  
  test('renders pharmacist listing correctly', () => {
    render(<ListingCard listing={mockPharmacistListing} onClick={() => {}} />);
    
    expect(screen.getByText('Pharmacist 12345')).toBeInTheDocument();
    expect(screen.getByText('Geneva, Switzerland')).toBeInTheDocument();
    expect(screen.getByText('CHF 85/hour')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });
  
  test('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<ListingCard listing={mockJobListing} onClick={onClick} />);
    
    fireEvent.click(screen.getByText('Pharmacist Position'));
    expect(onClick).toHaveBeenCalledWith(mockJobListing);
  });
}); 