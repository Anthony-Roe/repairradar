import re
import os
from typing import Dict, List, Tuple

class PrismaToTypescript:
    def __init__(self, schema_path: str):
        self.schema_path = schema_path
        self.models: Dict[str, Dict] = {}
        self.enums: Dict[str, List[str]] = {}

    def parse_schema(self) -> None:
        """Parse the Prisma schema file and extract models and enums."""
        with open(self.schema_path, 'r') as file:
            content = file.read()

        # Split into blocks
        blocks = re.split(r'\n\s*\n', content)

        current_model = None
        for block in blocks:
            block = block.strip()
            if not block:
                continue

            # Parse enums
            enum_match = re.match(r'enum\s+(\w+)\s*\{([^}]*)\}', block, re.DOTALL)
            if enum_match:
                enum_name = enum_match.group(1)
                values = [v.strip() for v in enum_match.group(2).split('\n') if v.strip()]
                self.enums[enum_name] = values
                continue

            # Parse models
            model_match = re.match(r'model\s+(\w+)\s*\{([^}]*)\}', block, re.DOTALL)
            if model_match:
                model_name = model_match.group(1)
                fields_content = model_match.group(2)
                self.models[model_name] = {
                    'fields': [],
                    'relations': [],
                    'mapped_name': model_name
                }
                current_model = model_name

                # Extract @@map if present
                map_match = re.search(r'@@map\("(\w+)"\)', fields_content)
                if map_match:
                    self.models[model_name]['mapped_name'] = map_match.group(1)

                # Parse fields
                for line in fields_content.split('\n'):
                    line = line.strip()
                    if not line or line.startswith('//') or line.startswith('@@'):
                        continue

                    field_match = re.match(r'(\w+)\s+([\w\[\]@]+)(\?)?(\s+@[\w\.\(\)\[\]:,"]+)?', line)
                    if field_match:
                        field_name = field_match.group(1)
                        field_type = field_match.group(2)
                        is_optional = bool(field_match.group(3))
                        attributes = field_match.group(4) or ''

                        # Handle @map in attributes
                        map_attr_match = re.search(r'@map\("(\w+)"\)', attributes)
                        mapped_name = map_attr_match.group(1) if map_attr_match else field_name

                        field_info = {
                            'name': field_name,
                            'mapped_name': mapped_name,
                            'type': field_type,
                            'optional': is_optional,
                            'attributes': attributes.strip()
                        }

                        # Detect relations
                        if field_type in self.models or field_type.rstrip('[]') in self.models:
                            field_info['is_relation'] = True
                            self.models[current_model]['relations'].append(field_info)
                        else:
                            self.models[current_model]['fields'].append(field_info)

    def prisma_type_to_ts(self, prisma_type: str, is_optional: bool) -> str:
        """Convert Prisma types to TypeScript types."""
        type_map = {
            'String': 'string',
            'Int': 'number',
            'Float': 'number',
            'Boolean': 'boolean',
            'DateTime': 'Date',
            'Json': 'any',  # Could be Record<string, any> or a specific type
            'Decimal': 'number',  # Prisma Decimal maps to JS number
            'Uuid': 'string',  # UUIDs are strings in TypeScript
            'VarChar': 'string',
            'Text': 'string',
            'Date': 'Date'
        }

        is_array = prisma_type.endswith('[]')
        base_type = prisma_type.rstrip('[]')

        if base_type in self.enums:
            ts_type = base_type
        elif base_type in self.models:
            ts_type = base_type
        else:
            ts_type = type_map.get(base_type, 'any')

        if is_array:
            ts_type = f'{ts_type}[]'

        return f'{ts_type}{" | null" if is_optional else ""}'

    def generate_typescript(self, output_path: str) -> None:
        """Generate TypeScript interfaces and types."""
        ts_code = ['// Auto-generated TypeScript types from Prisma schema\n']

        # Generate enums
        for enum_name, values in self.enums.items():
            ts_code.append(f'export enum {enum_name} {{')
            ts_code.extend(f'  {value} = "{value}",' for value in values)
            ts_code.append('}\n')

        # Generate interfaces
        for model_name, model_data in self.models.items():
            ts_code.append(f'export interface {model_name} {{')
            
            # Fields
            for field in model_data['fields']:
                ts_type = self.prisma_type_to_ts(field['type'], field['optional'])
                ts_code.append(f'  {field["mapped_name"]}: {ts_type};')

            # Relations
            for relation in model_data['relations']:
                ts_type = self.prisma_type_to_ts(relation['type'], relation['optional'])
                ts_code.append(f'  {relation["mapped_name"]}: {ts_type};')

            ts_code.append('}\n')

        # Write to file
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w') as f:
            f.write('\n'.join(ts_code))

    def run(self, output_path: str) -> None:
        """Run the conversion process."""
        self.parse_schema()
        self.generate_typescript(output_path)
        print(f"TypeScript types generated successfully at {output_path}")

def main():
    # Example usage
    schema_path = './prisma/schema.prisma'
    output_path = './types/models.ts'
    
    converter = PrismaToTypescript(schema_path)
    converter.run(output_path)

if __name__ == '__main__':
    main()