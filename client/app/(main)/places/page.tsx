'use client';

import React from 'react';

export default function PlacesPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700">
      <header className="px-8 py-6 border-b border-outline/5 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-on-surface">Khám phá Địa điểm</h1>
          <p className="text-outline text-xs font-bold uppercase tracking-widest">Unveil the hidden archives of Hanoi</p>
        </div>
        <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-2xl border border-outline/5">
          {['Tất cả', 'Văn hóa', 'Ẩm thực', 'Nghệ thuật'].map((filter, i) => (
            <button key={filter} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${i === 0 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-outline hover:text-primary hover:bg-primary/5'}`}>
              {filter}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {[
            { title: 'The Old Quarter', category: 'Cultural', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBS6b92EyHcnxNeXz_VuUVdBhOGbY0U1p20ztvsYraHcQgwBWkOV3MGDMBMiRJjB73lDLFk_mL2aTNyRTbevMFwiBxEbOfyeamd296xaZM5MqDWofZLafllT67TOi2UIoSNFl2rOMjDGM3l3L-4aBBQvSKqpiC0Gi4E3-GJS-nGidgnY1Wb8siJIGHY4wl2oocysO9Pmhb_P8sAJDAdIcsO69CXTa-BkPTmdPekdAIHJrDZpZzvUKIyCJe1ZlQ7MO4gsbzI9wSgovoD', height: 'h-80' },
            { title: 'Note Coffee', category: 'Lifestyle', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAu-bsocWiyWuntmqkceDix7iu9B_lCjqkd8THoMPAYyySq06xkjoN8ab1KWyc0bQ76lBdutb9EhKJnMFPbUJctc_RfKLXOD1gVPwJFhmp7deSURHzJrDSnTiru3q0YixUdcScUuKkOgaC1PyfI8PsrOvrlURK9aiaNfAMqR-uchBx5F6tQDo66Lt6MweYl8naUC0TwXxnKhD3blcui1INTjX2FmJan50Hw27diuXiATAUNwthyZCDCS2-0MkG9XJsb0DoR635pV7x', height: 'h-64' },
            { title: 'St. Joseph\'s Cathedral', category: 'Heritage', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3_3Ys6itfzI-qcjC6GGAbPLzJ7GlOiFbBkyfA4InHZ5en20ct237GwITHy0C4SOOdps7VFI7xdoeb9p_Z5_BMnT3ySaCiYB71MraVhFBrC-uUbEmbKfbOalGDYQQ5ykZ3qrTaRNMhfNtTIMtVao-GOB1PN-AMTM2tM8hD3lTIEl9oYZWVyIvGxxYzmtIHaVh_KXThvrJAn9-C83750PhxLWhu8EnknsR1kAxyQcdsFE3xOSjEeyMyo3GtQBjK3b1DG7-pyT2w8cDY', height: 'h-96' },
            { title: 'Long Bien Bridge', category: 'Photography', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTC1yLpiKQoH9Hd25hCqgyA8TSx-qKS-ojmE-gUvwOm0E-ySF-VHOAxdwaH5Uqf2CuHvwDss2eId6mePXyF_F6XR0rWBcHUX5fLoZgfyk3axrCqNKJiUNu9f0t_ymQt1-eE9kwwtROGqnX-nNcD-EqcPdLIJsohyo8uBF_MD554fU6pNkYO_XVzGtsovhqQ398kOSmSoc0q7rSqnlfZLz5YO3sphe0R76UuD5QfUsoXPoL2ljYif87peq4thBcpS-dIlprYqwDgRKr', height: 'h-72' },
            { title: 'Phan Dinh Phung St', category: 'Scenic', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4-iPwl61wIu2fTOvlPGHdynooI11BBN20UA0Lh_jjmsGeVSnz84vQb18GYamR1CDOncYAkiZOtfiP_TGbK0OMR39ZsGmTsSKr2KvjOBSmNn8m4JnEeijwB-NrfhFQyccJJWrO60ItlhNRLQgroYS6pjSQkJG2zyGTDgBbVjInVcCYocOHECqFYmZ-I7XU7sqZ6ux_4H9tqis2Qs1N-dygzHhIFkFeZboQ7m3_048PWQVBMAkVpfDQMvojSauf_65O5V2TTO-eSdwq', height: 'h-[28rem]' },
          ].map((place, i) => (
            <div key={i} className="break-inside-avoid group cursor-pointer bg-white rounded-[2.5rem] border border-outline/5 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500">
              <div className={`relative ${place.height} overflow-hidden`}>
                <img src={place.img} alt={place.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-6 left-6 flex gap-2">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-widest text-primary shadow-lg">{place.category}</span>
                </div>
              </div>
              <div className="p-8 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-xl tracking-tighter text-on-surface leading-none">{place.title}</h3>
                  <div className="flex items-center gap-1 text-primary">
                    <span className="material-symbols-outlined text-sm">star</span>
                    <span className="text-xs font-black">4.9</span>
                  </div>
                </div>
                <p className="text-outline text-xs font-medium leading-relaxed">Discover the layers of history preserved in this iconic location.</p>
                <div className="pt-4 border-t border-outline/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-outline transition-colors group-hover:text-primary">
                  <span>View Archives</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
