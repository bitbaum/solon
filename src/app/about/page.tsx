import PageLayout from '@/components/ui/page-layout';

export default function AboutPage() {
  return (
    <PageLayout 
      title="About Solon" 
      description="Our mission to revolutionize organizational governance through Bitcoin-native transparency"
    >
      <div className="max-w-4xl mx-auto">
        
        {/* Mission Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-[var(--navy)] mb-6">Our Mission</h2>
          <div className="prose prose-lg text-gray-700">
            <p className="mb-4">
              Solon is building the future of organizational governance through radical transparency 
              and cryptographic democracy. We believe every organization deserves complete financial 
              transparency and democratic decision-making without the overhead of traditional systems.
            </p>
            <p>
              By leveraging Bitcoin&apos;s immutable blockchain and cryptographic signatures, we enable
              organizations to operate with unprecedented transparency while maintaining security 
              and privacy where needed.
            </p>
          </div>
        </div>

        {/* Principles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <PrincipleCard
            title="Radical Transparency"
            description="Every financial transaction and organizational decision is publicly verifiable on the Bitcoin blockchain"
            icon="🔍"
          />
          <PrincipleCard
            title="Cryptographic Democracy"
            description="Democratic decision-making secured by cryptographic signatures and mathematical verification"
            icon="🗳️"
          />
          <PrincipleCard
            title="Bitcoin-Native Operations"
            description="Global operations without traditional banking infrastructure or currency dependencies"
            icon="₿"
          />
          <PrincipleCard
            title="Open Source Foundation"
            description="Built on open protocols and standards for maximum trust and interoperability"
            icon="🌐"
          />
        </div>

        {/* Team Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-[var(--navy)] mb-6">The Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TeamMember
              name="Alex Chen"
              role="Founder & CEO"
              bio="Former Bitcoin Core contributor with 10+ years in cryptographic systems"
              avatar="👨‍💻"
            />
            <TeamMember
              name="Sarah Martinez"
              role="Head of Security"
              bio="Cryptography researcher specializing in multi-signature schemes and zero-knowledge proofs"
              avatar="👩‍🔬"
            />
            <TeamMember
              name="David Kim"
              role="Lead Engineer"
              bio="Full-stack developer with expertise in Bitcoin infrastructure and governance systems"
              avatar="👨‍🔧"
            />
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-12">
          <div className="bg-[var(--navy)] text-white p-8 rounded-xl">
            <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Organization?</h3>
            <p className="text-gray-300 mb-6">
              Join the future of transparent governance. Contact us to learn how Solon can 
              revolutionize your organization&apos;s operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-[var(--navy)] px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold">
                Schedule Demo
              </button>
              <button className="border border-gray-400 text-white px-8 py-3 rounded-lg hover:bg-white/10 transition-colors font-semibold">
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function PrincipleCard({ title, description, icon }: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-[var(--navy)] mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function TeamMember({ name, role, bio, avatar }: {
  name: string;
  role: string;
  bio: string;
  avatar: string;
}) {
  return (
    <div className="text-center">
      <div className="text-6xl mb-4">{avatar}</div>
      <h4 className="font-bold text-[var(--navy)] text-lg">{name}</h4>
      <p className="text-[var(--solon-orange)] font-medium mb-2">{role}</p>
      <p className="text-gray-600 text-sm">{bio}</p>
    </div>
  );
}