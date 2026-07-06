import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TextFieldEmptyState } from '@/components/common/text-field-empty-state';
import type { CustomerDiveInfo } from '@/features/customers/types';
import { formatDisplayDate } from '@/lib/format';

import { CustomerDetailField } from './customer-detail-field';

type CustomerDivingInfoCardProps = {
  diveInfo: CustomerDiveInfo;
};

/**
 * Checks whether latest known diving experience values exist for the customer.
 *
 * @param diveInfo - Latest known booking-derived dive values.
 * @returns True when at least one diving experience field is present.
 */
function hasDivingExperience(diveInfo: CustomerDiveInfo) {
  return Boolean(
    diveInfo.certificationLevel ||
      diveInfo.certificationAgency ||
      diveInfo.lastDiveDate ||
      diveInfo.divesLogged,
  );
}

/**
 * Checks whether latest known equipment profile values exist for the customer.
 *
 * @param diveInfo - Latest known booking-derived equipment values.
 * @returns True when at least one equipment field is present.
 */
function hasEquipmentDetails(diveInfo: CustomerDiveInfo) {
  return Boolean(
    diveInfo.heightCm ||
      diveInfo.weightKg ||
      diveInfo.shoeSize ||
      diveInfo.equipmentNotes,
  );
}

/**
 * Renders a small heading for grouped diving and equipment fields.
 *
 * @param props - Staff-facing subsection title.
 * @returns Uppercase subsection heading.
 */
function DivingInfoSubsectionTitle({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </h3>
  );
}

/**
 * Renders latest known dive and equipment values for a customer.
 *
 * @param props - Display-only latest known dive information.
 * @returns Card containing grouped diving experience and equipment fields.
 */
export function CustomerDivingInfoCard({
  diveInfo,
}: CustomerDivingInfoCardProps) {
  const hasExperience = hasDivingExperience(diveInfo);
  const hasEquipment = hasEquipmentDetails(diveInfo);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="border-b">
        <CardTitle>Diving and equipment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <DivingInfoSubsectionTitle title="Diving experience" />
          {hasExperience ? (
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
            </div>
          ) : (
            <TextFieldEmptyState
              className="py-4"
              message="No diving experience recorded."
            />
          )}
        </section>

        <section className="space-y-3">
          <DivingInfoSubsectionTitle title="Equipment profile" />
          {hasEquipment ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CustomerDetailField
                label="Height"
                value={
                  diveInfo.heightCm === null ? null : `${diveInfo.heightCm} cm`
                }
              />
              <CustomerDetailField
                label="Weight"
                value={
                  diveInfo.weightKg === null ? null : `${diveInfo.weightKg} kg`
                }
              />
              <CustomerDetailField label="Shoe size" value={diveInfo.shoeSize} />
              <CustomerDetailField
                label="Equipment notes / mask notes"
                value={diveInfo.equipmentNotes}
              />
            </div>
          ) : (
            <TextFieldEmptyState
              className="py-4"
              message="No equipment details recorded."
            />
          )}
        </section>
      </CardContent>
    </Card>
  );
}

