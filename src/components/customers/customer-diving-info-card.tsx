import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { CustomerDiveInfo } from '@/features/customers/types';
import { formatDisplayDate } from '@/lib/format';

import { CustomerDetailField } from './customer-detail-field';

type CustomerDivingInfoCardProps = {
  diveInfo: CustomerDiveInfo;
};

/**
 * Renders latest known dive and equipment values for a customer.
 *
 * @param props - Display-only latest known dive information.
 * @returns Card containing current/latest dive and equipment fields.
 */
export function CustomerDivingInfoCard({
  diveInfo,
}: CustomerDivingInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Diving and equipment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CustomerDetailField
            label="Certification level"
            value={diveInfo.certificationLevel}
          />
          <CustomerDetailField
            label="Certification agency"
            value={diveInfo.certificationAgency}
          />
          <CustomerDetailField
            label="Last dive date"
            value={formatDisplayDate(diveInfo.lastDiveDate)}
          />
          <CustomerDetailField
            label="Logged dives"
            value={diveInfo.divesLogged}
          />
          <CustomerDetailField
            label="Height"
            value={
              diveInfo.heightCm === null ? null : `${diveInfo.heightCm} cm`
            }
          />
          <CustomerDetailField
            label="Weight"
            value={diveInfo.weightKg === null ? null : `${diveInfo.weightKg} kg`}
          />
          <CustomerDetailField label="Shoe size" value={diveInfo.shoeSize} />
          <CustomerDetailField
            label="Equipment notes"
            value={diveInfo.equipmentNotes}
          />
        </div>
      </CardContent>
    </Card>
  );
}

