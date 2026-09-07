import { useState } from 'react';
import { useI18n } from '@/app/i18n-context';
import { useFocusHeading } from '@/app/environment-context';
import { validatePilotForm, type PilotFormInput } from '@/domain/validators';
import { Button } from '@/components/ui/Button';
import { ErrorSummary, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';

const COUNTRIES = ['FR', 'BE', 'DE', 'NL', 'ES', 'IT', 'CH', 'GB', 'US'];

const EMPTY: PilotFormInput = {
  organisation: '',
  contact: '',
  email: '',
  role: 'winery',
  country: 'FR',
  website: '',
  message: '',
};

/**
 * PUB-07. Nothing is sent: the submit button produces a local file and says
 * so. No destination address is invented, and the form is not stored.
 */
export default function Pilot() {
  const { d, fmt, locale } = useI18n();
  const [form, setForm] = useState<PilotFormInput>(EMPTY);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [downloaded, setDownloaded] = useState(false);
  useFocusHeading(d.pilot.title);

  const set = (key: keyof PilotFormInput) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDownloaded(false);
  };

  const messageFor = (code: string, params?: Record<string, string | number>) =>
    fmt((d.validation[code as keyof typeof d.validation] as string) ?? code, params ?? {});

  const submit = () => {
    const result = validatePilotForm(form);
    if (!result.ok) {
      setErrors(
        result.errors.map((error) => ({
          field: error.field,
          message: `${d.pilot.form[error.field as keyof typeof d.pilot.form] ?? error.field}: ${messageFor(error.code, error.params)}`,
        })),
      );
      document.querySelector<HTMLElement>('[data-error-summary]')?.focus();
      return;
    }
    setErrors([]);
    const lines = [
      'Palissage — pilot enquiry draft',
      'This file was generated locally in your browser. Nothing has been sent.',
      '',
      `${d.pilot.form.organisation}: ${form.organisation}`,
      `${d.pilot.form.contact}: ${form.contact}`,
      `${d.pilot.form.email}: ${form.email}`,
      `${d.pilot.form.role}: ${form.role}`,
      `${d.pilot.form.country}: ${form.country}`,
      `${d.pilot.form.website}: ${form.website || '—'}`,
      '',
      `${d.pilot.form.message}:`,
      form.message || '—',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'palissage-pilot-enquiry-draft.txt';
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  const errorFor = (field: string) => errors.find((error) => error.field === field)?.message.split(': ').slice(1).join(': ');

  return (
    <div className="container-public py-10 md:py-16">
      <div className="max-w-prose">
        <h1 className="h1">{d.pilot.title}</h1>
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_minmax(340px,420px)] lg:gap-16">
        <div className="max-w-prose">
          <section>
            <SectionHeader as="h3" title={d.pilot.sections.who} />
            <p className="mt-3 text-fg-secondary">{d.pilot.sections.whoBody}</p>
          </section>

          <section className="mt-10">
            <SectionHeader as="h3" title={d.pilot.sections.what} />
            <p className="mt-3 text-fg-secondary">{d.pilot.sections.whatBody}</p>
          </section>

          <section className="mt-10">
            <SectionHeader as="h3" title={d.pilot.sections.stage} />
            <p className="mt-3 text-fg-secondary">{d.pilot.sections.stageBody}</p>
          </section>

          <section id="technology" className="mt-10">
            <SectionHeader as="h3" title={d.pilot.sections.technology} />
            <p className="mt-3 text-fg-secondary">{d.pilot.sections.technologyBody}</p>
          </section>

          <section className="mt-10">
            <SectionHeader as="h3" title={d.pilot.sections.milestones} />
            <ol className="mt-4 flex flex-col gap-3">
              {d.pilot.milestones.map((milestone, index) => (
                <li key={milestone} className="flex items-start gap-3 border-b border-line pb-3 text-sm">
                  <span className="caption tabular w-6 shrink-0 text-accent">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1">{milestone}</span>
                  <StatusBadge tone="neutral">{d.pilot.planned}</StatusBadge>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-10">
            <SectionHeader as="h3" title={d.pilot.sections.support} />
            <p className="mt-3 text-fg-secondary">{d.pilot.sections.supportBody}</p>
          </section>
        </div>

        <div>
          <div className="panel lg:sticky lg:top-[calc(var(--header-height)+24px)]">
            <h2 className="h3">{d.pilot.sections.enquiry}</h2>
            <p className="caption mt-2">{d.pilot.form.hint}</p>

            <form
              className="mt-6 flex flex-col gap-4"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <div data-error-summary tabIndex={-1}>
                <ErrorSummary title={d.common.errorSummary} errors={errors} />
              </div>

              <TextField
                label={d.pilot.form.organisation}
                fieldName="organisation"
                required
                value={form.organisation}
                error={errorFor('organisation')}
                onChange={(event) => set('organisation')(event.target.value)}
              />
              <TextField
                label={d.pilot.form.contact}
                fieldName="contact"
                required
                value={form.contact}
                error={errorFor('contact')}
                onChange={(event) => set('contact')(event.target.value)}
              />
              <TextField
                label={d.pilot.form.email}
                fieldName="email"
                type="email"
                required
                value={form.email}
                error={errorFor('email')}
                onChange={(event) => set('email')(event.target.value)}
              />
              <SelectField
                label={d.pilot.form.role}
                fieldName="role"
                required
                value={form.role}
                onChange={(event) => set('role')(event.target.value)}
              >
                <option value="winery">{d.pilot.form.roleOptions.winery}</option>
                <option value="importer">{d.pilot.form.roleOptions.importer}</option>
                <option value="shop">{d.pilot.form.roleOptions.shop}</option>
                <option value="restaurant">{d.pilot.form.roleOptions.restaurant}</option>
                <option value="other">{d.pilot.form.roleOptions.other}</option>
              </SelectField>
              <SelectField
                label={d.pilot.form.country}
                fieldName="country"
                required
                value={form.country}
                onChange={(event) => set('country')(event.target.value)}
              >
                {COUNTRIES.map((code) => (
                  <option key={code} value={code}>
                    {new Intl.DisplayNames([locale === 'fr' ? 'fr-FR' : 'en-GB'], { type: 'region' }).of(code) ?? code}
                  </option>
                ))}
              </SelectField>
              <TextField
                label={d.pilot.form.website}
                fieldName="website"
                type="url"
                optionalLabel={d.common.optional}
                placeholder="https://"
                value={form.website}
                error={errorFor('website')}
                onChange={(event) => set('website')(event.target.value)}
              />
              <TextAreaField
                label={d.pilot.form.message}
                fieldName="message"
                optionalLabel={d.common.optional}
                value={form.message}
                error={errorFor('message')}
                onChange={(event) => set('message')(event.target.value)}
              />

              <Button type="submit" fullWidth>
                {d.pilot.form.submit}
              </Button>

              {downloaded ? (
                <Notice tone="success">{d.pilot.form.success}</Notice>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
