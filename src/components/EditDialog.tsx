// src/components/common/EditDialog.tsx
'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, CalendarIcon, Clock } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { SelectMulti } from './SelectMulti';

type StatusOption = {
  value: string;
  label: string;
};

type FieldType = 'text' | 'number' | 'select' | 'selectmulti' | 'date' | 'time' | 'datetime' | 'currency';

type EditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  initialData: Record<string, any>;
  fields: {
    name: string;
    label: string;
    type: FieldType;
    required?: boolean;
    options?: StatusOption[];
  }[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
};

export function EditDialog({
  open,
  onOpenChange,
  title,
  description,
  initialData,
  fields,
  onSubmit,
}: EditDialogProps) {
  const [formData, setFormData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (name: string, value: string | Date | string[]) => {
    // Convert Date objects to ISO strings for consistent storage
    const formattedValue = value instanceof Date 
    ? value.toISOString() 
    : Array.isArray(value)
    ? value
    : value;
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const renderField = (field: {
    name: string;
    label: string;
    type: FieldType;
    required?: boolean;
    options?: StatusOption[];
  }) => {
    switch (field.type) {
      case 'select':
        return (
          <Select
            value={formData[field.name] || ''}
            onValueChange={(value) => handleChange(field.name, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'selectmulti':
          return (
            <SelectMulti
              options={field.options || []}
              value={formData[field.name] || []}
              onChange={(value) => handleChange(field.name, value)}
              placeholder={`Select ${field.label.toLowerCase()}`}
            />
          );
      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData[field.name] ? (
                  format(new Date(formData[field.name]), 'PPP')
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData[field.name] ? new Date(formData[field.name]) : undefined}
                onSelect={(date) => date && handleChange(field.name, date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'time':
        return (
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="time"
              className="pl-9"
              value={formData[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={field.required}
            />
          </div>
        );

      case 'datetime':
        return (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData[field.name] ? (
                    format(new Date(formData[field.name]), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData[field.name] ? new Date(formData[field.name]) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const current = formData[field.name] ? new Date(formData[field.name]) : new Date();
                      date.setHours(current.getHours());
                      date.setMinutes(current.getMinutes());
                      handleChange(field.name, date);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="time"
                className="pl-9"
                value={formData[field.name] ? format(new Date(formData[field.name]), 'HH:mm') : ''}
                onChange={(e) => {
                  const time = e.target.value;
                  if (time) {
                    const [hours, minutes] = time.split(':');
                    const date = formData[field.name] ? new Date(formData[field.name]) : new Date();
                    date.setHours(parseInt(hours, 10));
                    date.setMinutes(parseInt(minutes, 10));
                    handleChange(field.name, date);
                  }
                }}
                required={field.required}
              />
            </div>
          </div>
        );

        case 'currency':
          return (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id={field.name}
                type="text"
                className="pl-6"
                value={formData[field.name] || ''}
                onChange={(e) => {
                  // Update the raw value without formatting while typing
                  handleChange(field.name, e.target.value);
                }}
                onBlur={(e) => {
                  // When the input field loses focus, format the value as currency
                  const rawValue = e.target.value.replace(/[^\d.]/g, ''); // Remove non-numeric characters
                  const formattedValue = parseFloat(rawValue).toLocaleString('en-US', {
                    style: 'decimal',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                  handleChange(field.name, formattedValue); // Update formatted value
                }}
                required={field.required}
              />
            </div>
          );


      default:
        return (
          <Input
            id={field.name}
            type={field.type}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            required={field.required}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(field => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {renderField(field)}
            </div>
          ))}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}